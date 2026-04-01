// ============================================
// 路由统一导出
// ============================================

const express = require('express');
const router = express.Router();

// 导入各模块路由
const authRoutes = require('./auth');
const userRoutes = require('./user');
const coupleRoutes = require('./couple');
const inviteRoutes = require('./invite');
const syncRoutes = require('./sync');
const expressRoutes = require('./express');
const pickupLocationRoutes = require('./pickupLocation');
const photoRoutes = require('./photo');
const travelRoutes = require('./travel');
const foodRoutes = require('./food');
const foodWishRoutes = require('./foodWish');
const wishRoutes = require('./wishes');
const habitRoutes = require('./habit');
const notificationRoutes = require('./notifications');
const systemRoutes = require('./system');
const aiRoutes = require('./ai');
const aiApplyRoutes = require('./ai-apply');

// 挂载路由
router.use('/user', userRoutes);          // /api/user/*  必须放在 authRoutes 之前
router.use('/', authRoutes);              // /api/register, /api/login, /api/me, /api/user/:userId
router.use('/', coupleRoutes);            // /api/bind, /api/couple/unbind, /api/unbind
router.use('/invite', inviteRoutes);      // /api/invite/*
router.use('/sync', syncRoutes);          // /api/sync
router.use('/express', expressRoutes);    // /api/express/*
router.use('/pickup-locations', pickupLocationRoutes); // /api/pickup-locations/*
router.use('/', photoRoutes);             // /api/upload, /api/photos/*
router.use('/travels', travelRoutes);     // /api/travels/*
router.use('/foods', foodRoutes);         // /api/foods/*
router.use('/food-wishes', foodWishRoutes); // /api/food-wishes/*
router.use('/wishes', wishRoutes);            // /api/wishes/* (心愿墙)
router.use('/habits', habitRoutes);       // /api/habits/*
router.use('/notifications', notificationRoutes); // /api/notifications/*
router.use('/ai', aiRoutes);              // /api/ai/*
router.use('/ai', aiApplyRoutes);         // /api/ai/apply-plan
router.use('/', systemRoutes);            // /api/storage/status

module.exports = router;
