const test = require('node:test');
const assert = require('node:assert/strict');

const webpush = require('web-push');
const { getNotification } = require('../config/notifications');
const { User } = require('../models');
const {
  buildWeeklyReportPayload,
  buildWeeklyReportSummary,
  getRecentReportDates,
  sendNotification
} = require('../services/notificationScheduler');

const userId = '111111111111111111111111';
const partnerId = '222222222222222222222222';

let originalUserFindById;
let originalSendNotification;

test.before(() => {
  originalUserFindById = User.findById;
  originalSendNotification = webpush.sendNotification;
});

test.after(() => {
  User.findById = originalUserFindById;
  webpush.sendNotification = originalSendNotification;
});

test.beforeEach(() => {
  User.findById = originalUserFindById;
  webpush.sendNotification = originalSendNotification;
});

test('weekly report dates cover the latest seven local calendar days', () => {
  const dates = getRecentReportDates(new Date('2026-07-05T21:00:00+08:00'));

  assert.deepEqual(dates, [
    '2026-06-29',
    '2026-06-30',
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-04',
    '2026-07-05'
  ]);
});

test('weekly report summary deduplicates multiple plans on the same day', () => {
  const weekDates = ['2026-06-29', '2026-06-30', '2026-07-01'];
  const summary = buildWeeklyReportSummary([
    { userId, date: '2026-06-29' },
    { userId, date: '2026-06-29' },
    { userId, date: '2026-06-30' },
    { userId: partnerId, date: '2026-06-30' },
    { userId: partnerId, date: '2026-07-01' },
    { userId: partnerId, date: '2026-07-08' }
  ], userId, partnerId, weekDates);

  assert.deepEqual(summary, {
    myTotal: 2,
    partnerTotal: 2,
    bothCompleted: 1,
    totalDays: 3
  });

  const payload = buildWeeklyReportPayload(summary, weekDates);
  assert.equal(payload.data.url, '/plans');
  assert.equal(payload.data.weekStart, '2026-06-29');
  assert.equal(payload.data.weekEnd, '2026-07-01');
  assert.match(payload.body, /其中1天一起打卡/);
});

test('weekly report copy avoids praising an empty week', () => {
  const notification = getNotification('habitWeekendSummary', {
    myCompleted: 0,
    partnerCompleted: 0,
    bothCompleted: 0,
    total: 7
  });

  assert.equal(notification.title, '📊 本周打卡总结');
  assert.match(notification.body, /还没有留下打卡记录/);
  assert.equal(notification.body.includes('默契满分'), false);
});

test('scheduled notifications honor the requested notification setting key', async () => {
  let pushCount = 0;

  User.findById = async () => ({
    _id: userId,
    notificationSettings: {
      dailyReminder: false,
      weeklyReport: true
    },
    pushSubscriptions: [{
      endpoint: 'https://push.example/subscription',
      keys: {
        p256dh: 'public-key',
        auth: 'auth-secret'
      }
    }]
  });

  webpush.sendNotification = async (_subscription, payload) => {
    pushCount++;
    assert.equal(JSON.parse(payload).title, '周报');
  };

  const weeklySent = await sendNotification(userId, { title: '周报', body: '本周总结' }, 'weeklyReport');
  const dailySent = await sendNotification(userId, { title: '每日', body: '今日提醒' }, 'dailyReminder');

  assert.equal(weeklySent, true);
  assert.equal(dailySent, false);
  assert.equal(pushCount, 1);
});
