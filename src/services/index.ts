import authRoutes from './auth/routes';
import dashboardRoutes from './dashboard/routes';
import barcodeRoutes from './barcode/routes';
import orderRoutes from './order/routes';
import deviceRoutes from './device/routes';
import inventoryRoutes from './inventory/routes';
import notificationRoutes from './notification/routes';
import shopifyRoutes from './shopify/routes';
import analyticsRoutes from './analytics/routes';
export default [
    ...authRoutes,
    ...dashboardRoutes,
    ...barcodeRoutes,
    ...orderRoutes,
    ...deviceRoutes,
    ...inventoryRoutes,
    ...notificationRoutes,
    ...shopifyRoutes,
    ...analyticsRoutes
];
