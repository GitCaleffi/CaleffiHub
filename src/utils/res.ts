const success = (res: any, message: any, code: any) => {
  res.status(code).json({
    is_success: true,
    message: message,
    responseCode: code,
  });
};
const data = (res: any, item: any, code: any, message: any = "") => {
  res.status(code).json({
    is_success: true,
    data: item,
    message: message,
    responseCode: code,
  });
};
const linkData = (res: any, item: any, code: any, link: any = "") => {
  res.status(code).json({
    is_success: true,
    data: item,
    link: link,
    responseCode: code,
  });
};
const token = (res: any, item: any, code: any) => {
  res.status(code).json({
    is_success: true,
    token: item,
    responseCode: code,
  });
};
const failure = (res: any, error: any, code: any) => {
  res.status(code).json({
    is_success: false,
    message: error.message ? error.message : error,
    responseCode: code,
  });
};

const page = (
  res: any,
  items: any,
  total: any,
  page_no: any,
  code: any,
  type: any = ""
) => {
  res.status(code).json({
    is_success: true,
    data: {
      items: items,
      skip: page_no || 0,
      userType: type,
      total: total || items.length,
    },
    responseCode: code,
  });
};

module.exports = {
  success,
  data,
  token,
  failure,
  page,
  linkData,
};
