var crypto=require("crypto");
exports.md5=function(data){
  return crypto.createHash('md5').update(data).digest('base64');
};
