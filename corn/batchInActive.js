const cron = require('node-cron');
const Batch = require('../models/Batch');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
    //   const cutoffDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const cutoffDate = new Date(Date.now() - 5 * 60 * 1000); // 20 minutes ago


    try {
        const updated = await Batch.updateMany(
            {
                courseCompleted: true,
                isActive: true,
                courseCompletedAt: { $lte: cutoffDate }
            },
            { isActive: false }
        );

        console.log(`[CRON] Batches deactivated: ${updated.modifiedCount}`);
    } catch (err) {
        console.error('[CRON] Error deactivating batches:', err.message);
    }
});
