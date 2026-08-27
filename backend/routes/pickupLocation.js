// ============================================
// 取件地点路由
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { User, PickupLocation, ExpressDelivery } = require('../models');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

function serializeLocation(location) {
  return {
    id: location._id,
    name: location.name,
    createdBy: location.createdBy
  };
}

function emitPickupLocationSync(app, coupleId, { action, payload, actor }) {
  const broadcast = app.locals.broadcastToCouple;
  if (!broadcast || !coupleId) return;

  broadcast(coupleId, {
    type: 'pickupLocationSync',
    data: { action, payload, actor }
  });
}

function transactionUnavailable(error) {
  const message = String(error?.message || '');
  return message.includes('Transaction numbers are only allowed')
    || message.includes('Current topology does not support sessions')
    || message.includes('Sessions are not supported');
}

function includeRenameFields(query) {
  return typeof query?.select === 'function'
    ? query.select('+renameRequestId +renamePreviousName +renameNextName')
    : query;
}

async function completeLocationRename(location) {
  await ExpressDelivery.updateMany(
    { coupleId: location.coupleId, pickupLocation: location.renamePreviousName },
    { $set: { pickupLocation: location.renameNextName } }
  );
  const ready = await includeRenameFields(PickupLocation.findOneAndUpdate(
    {
      _id: location._id,
      coupleId: location.coupleId,
      createdBy: location.createdBy,
      renameStatus: 'pending',
      renameRequestId: location.renameRequestId,
      name: location.renamePreviousName
    },
    {
      $set: { name: location.renameNextName, renameStatus: 'ready' },
      $unset: { renamePreviousName: '', renameNextName: '' }
    },
    { new: true, runValidators: true }
  ));
  if (ready) return { location: ready, completedNow: true };
  const persisted = await includeRenameFields(PickupLocation.findOne({
    _id: location._id,
    coupleId: location.coupleId,
    createdBy: location.createdBy
  }));
  if (persisted?.renameStatus === 'ready' && persisted.name === location.renameNextName) {
    return { location: persisted, completedNow: false };
  }
  throw new Error('PICKUP_RENAME_STATE_CHANGED');
}

async function compensateLocationRename(location) {
  let claim = location;
  if (location.renameStatus === 'pending') {
    claim = await includeRenameFields(PickupLocation.findOneAndUpdate(
      {
        _id: location._id,
        coupleId: location.coupleId,
        createdBy: location.createdBy,
        renameStatus: 'pending',
        renameRequestId: location.renameRequestId
      },
      { $set: { renameStatus: 'compensating' } },
      { new: true, runValidators: true }
    ));
  }
  if (!claim) throw new Error('PICKUP_RENAME_RECOVERY_BUSY');
  await ExpressDelivery.updateMany(
    { coupleId: claim.coupleId, pickupLocation: claim.renameNextName },
    { $set: { pickupLocation: claim.renamePreviousName } }
  );
  const restored = await PickupLocation.findOneAndUpdate(
    {
      _id: claim._id,
      coupleId: claim.coupleId,
      createdBy: claim.createdBy,
      renameStatus: 'compensating',
      renameRequestId: claim.renameRequestId
    },
    {
      $set: { name: claim.renamePreviousName, renameStatus: 'ready' },
      $unset: { renameRequestId: '', renamePreviousName: '', renameNextName: '' }
    },
    { new: true, runValidators: true }
  );
  if (!restored) throw new Error('PICKUP_RENAME_RECOVERY_BUSY');
  return restored;
}

async function renameLocationWithoutTransaction({ id, coupleId, createdBy, newName }) {
  let location = await includeRenameFields(PickupLocation.findOne({ _id: id, coupleId, createdBy }));
  if (!location) return null;
  if (location.renameStatus === 'compensating') {
    await compensateLocationRename(location);
    location = await includeRenameFields(PickupLocation.findOne({ _id: id, coupleId, createdBy }));
  }
  if (location.renameStatus === 'pending') {
    if (location.renameNextName !== newName) {
      const completed = await completeLocationRename(location);
      location = completed.location;
    } else {
      const completed = await completeLocationRename(location);
      return { location: completed.location, replay: true, completedNow: completed.completedNow };
    }
  }
  if (location.name === newName) return { location, replay: true, completedNow: false };

  const requestId = `pickup-rename-${new mongoose.Types.ObjectId()}`;
  const claimed = await includeRenameFields(PickupLocation.findOneAndUpdate(
    {
      _id: id,
      coupleId,
      createdBy,
      name: location.name,
      renameStatus: { $nin: ['pending', 'compensating'] }
    },
    {
      $set: {
        renameStatus: 'pending',
        renameRequestId: requestId,
        renamePreviousName: location.name,
        renameNextName: newName
      }
    },
    { new: true, runValidators: true }
  ));
  if (!claimed) throw new Error('PICKUP_RENAME_BUSY');
  try {
    const completed = await completeLocationRename(claimed);
    return { location: completed.location, replay: false, completedNow: completed.completedNow };
  } catch (error) {
    const persisted = await includeRenameFields(PickupLocation.findOne({ _id: id, coupleId, createdBy }));
    if (persisted?.renameStatus === 'ready' && persisted.name === newName) {
      return { location: persisted, replay: true, completedNow: false };
    }
    await compensateLocationRename(persisted || claimed);
    throw error;
  }
}

async function renameLocationAndDeliveries({ id, coupleId, createdBy, previousName, newName }) {
  const operation = async (session) => {
    const sessionOptions = session ? { session } : {};
    const updatedLocation = await PickupLocation.findOneAndUpdate(
      { _id: id, coupleId, createdBy },
      { name: newName },
      { new: true, ...sessionOptions }
    );

    if (!updatedLocation) return null;

    await ExpressDelivery.updateMany(
      { coupleId, pickupLocation: previousName },
      { $set: { pickupLocation: newName } },
      sessionOptions
    );
    return { location: updatedLocation, replay: false, completedNow: true };
  };

  if (mongoose.connection.readyState !== 1) return operation();
  try {
    return await mongoose.connection.transaction((session) => operation(session));
  } catch (error) {
    if (!transactionUnavailable(error) || mongoose.connection.readyState !== 1) throw error;
    return renameLocationWithoutTransaction({ id, coupleId, createdBy, newName });
  }
}

/**
 * @route   GET /api/pickup-locations
 * @desc    获取取件地点列表
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const locations = await PickupLocation.find({ coupleId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: locations.map(loc => ({
        id: loc._id,
        name: loc.name,
        createdBy: loc.createdBy
      }))
    });
  } catch (error) {
    logError('获取取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/pickup-locations
 * @desc    添加取件地点
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '地点名称不能为空'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const locationName = name.trim();
    
    // 检查是否已存在
    const existing = await PickupLocation.findOne({ coupleId, name: locationName });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该地点已存在'
      });
    }
    
    const newLocation = new PickupLocation({
      coupleId,
      name: locationName,
      createdBy: userId
    });
    
    await newLocation.save();

    const responseLocation = serializeLocation(newLocation);
    emitPickupLocationSync(req.app, coupleId, {
      action: 'create',
      payload: responseLocation,
      actor: userId
    });
    
    res.json({
      success: true,
      message: '添加成功',
      data: responseLocation
    });
  } catch (error) {
    logError('添加取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/pickup-locations/:id
 * @desc    修改取件地点
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '地点名称不能为空'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const newName = name.trim();
    
    // 检查新名称是否已存在
    const existing = await PickupLocation.findOne({ 
      coupleId, 
      name: newName,
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该地点名称已存在'
      });
    }
    
    const location = await PickupLocation.findOne({ _id: req.params.id, coupleId });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }

    if (String(location.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能修改自己创建的地点'
      });
    }

    const renameResult = await renameLocationAndDeliveries({
      id: req.params.id,
      coupleId,
      createdBy: userId,
      previousName: location.name,
      newName
    });
    
    if (!renameResult) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }

    const responseLocation = serializeLocation(renameResult.location);
    if (!renameResult.replay || renameResult.completedNow) {
      emitPickupLocationSync(req.app, coupleId, {
        action: 'update',
        payload: responseLocation,
        actor: userId
      });
    }
    
    res.json({
      success: true,
      message: '修改成功',
      data: responseLocation
    });
  } catch (error) {
    logError('修改取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/pickup-locations/:id
 * @desc    删除取件地点
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const location = await PickupLocation.findOne({
      _id: req.params.id,
      coupleId
    });
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }

    if (String(location.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己创建的地点'
      });
    }

    const deleteResult = await PickupLocation.deleteOne({ _id: req.params.id, coupleId, createdBy: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }

    emitPickupLocationSync(req.app, coupleId, {
      action: 'delete',
      payload: { id: req.params.id, name: location.name },
      actor: userId
    });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('删除取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
