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
const achievementRoutes = require('./achievements');
const notificationRoutes = require('./notifications');
const systemRoutes = require('./system');
const aiRoutes = require('./ai');
const aiApplyRoutes = require('./ai-apply');
const moodRoutes = require('./mood');
const cosmeticRoutes = require('./cosmetics');
const budgetRoutes = require('./budget');
const accountRoutes = require('./accounts');
const exchangeRateRoutes = require('./exchangeRates');
const healthRoutes = require('./health');
const shoppingRoutes = require('./shopping');

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
router.use('/achievements', achievementRoutes);   // /api/achievements/*
router.use('/notifications', notificationRoutes); // /api/notifications/*
router.get('/vapid-public-key', (req, res) => {
  // 直接返回 VAPID 公钥，避免 404
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || ''
  });
});
router.use('/ai', aiRoutes);              // /api/ai/*
router.use('/ai', aiApplyRoutes);         // /api/ai/apply-plan
router.use('/mood', moodRoutes);          // /api/mood/*
router.use('/budget', budgetRoutes);     // /api/budget/*
router.use('/accounts', accountRoutes);    // /api/accounts/*
router.use('/exchange-rates', exchangeRateRoutes); // /api/exchange-rates/*
router.use('/cosmetics', cosmeticRoutes); // /api/cosmetics/*
router.use('/health', healthRoutes);      // /api/health/*
router.use('/shopping', shoppingRoutes);  // /api/shopping/*
router.use('/', systemRoutes);            // /api/storage/status

module.exports = router;
