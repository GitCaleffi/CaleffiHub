import { Response, NextFunction } from 'express';
import { CommonUtilities } from "../../utils/CommonUtilities";
import { AppDataSource } from "../../utils/ormconfig";
import { MESSAGES } from "../../utils/messages";
import { Inventory } from '../../db/Inventory';
import axios from 'axios';


//  upload delta inventory to shopify  //
export const uploadDeltaInventory = async (res: Response, next: NextFunction) => {
  try {
    const inventoryRepository = AppDataSource.getRepository(Inventory);

    const aggregatedInventory = await inventoryRepository
      .createQueryBuilder("inventory")
      .select("inventory.sku", "sku")
      .addSelect("SUM(inventory.totalQuantity)", "totalQuantity")
      .groupBy("inventory.sku")
      .getRawMany();

    if (!aggregatedInventory.length) {
      return CommonUtilities.sendResponsData({
        code: 200,
        message: 'No inventory to update',
        data: {},
      });
    }

    const now = new Date();
    const getFormattedDate = now.toLocaleDateString("it-IT").replace(/\//g, "/").slice(0, 8);

    const stocks = aggregatedInventory.map(item => ({
      "Cod_Art": item.sku,
      "Cod_Mag": "R1",
      "Quant_Disponibile": item.totalQuantity,
      "Stock_out_of_Stock": "N",
      "Art_Attivo": "N",
      "Quant_Previsione": "000000000",
      "Ord_Status": "",
      "Data_Ultima_Elabor": getFormattedDate,
      "Ora_Ultima_Elabor": getFormattedDate
    }));

    const response = await axios.post(`https://webhooks.getmesa.com/v1/caleffispa/trigger-webhook/665812c988cacd331602e39e/665812dc1f76a7af030dc2e6.json?apikey=${process.env.SHOPIFY_API_KEY}`, {
      stocks
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return CommonUtilities.sendResponsData({
      code: 200,
      message: MESSAGES.SUCCESS,
      data: response?.data,
    });
  } catch (error) {
    next(error)
  }
};

