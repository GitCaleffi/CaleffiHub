import * as crone from 'node-cron'
import { CronUtilities } from './cronUtilities';

//  cron-job to send Upload Reminder  // min =>  "* * * * *"   // hour => '0 * * * *'
crone.schedule('0 * * * *', async () => {
    try {
        await CronUtilities.sendFileUploadEmail()
    } catch (error) {
        console.error('Error calling API:', error);
    }
});

// cron-job to about last scanned sku  (every 6 hours)
crone.schedule('0 */6 * * *', async () => {
    try {
        await CronUtilities.checkLastActivity()
    } catch (error) {
        console.error('Error calling API:', error);
    }
});


// Runs every 15 minutes
crone.schedule("*/15 * * * *", () => {
    try {
    CronUtilities.uploadDeltaInventory();
    } catch (error) {
        console.error('Error Cron Job method:uploadDeltaInventory', error);
    }  
});

// Runs every 10 minutes
// Cron job to find new order from shopify and assign it to retailer with max margin amount orders 
crone.schedule("*/10 * * * *", () => {
    try {
    CronUtilities.assignOrderToLocation();
    CronUtilities.reassignmentOrders();
    } catch (error) {
        console.error('Error Cron Job method:assignOrderToLocations & method:reassignmentOrders', error);
    }  
});


