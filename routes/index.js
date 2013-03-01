exports.index = function(req, res){
  res.render('index', { title: 'CA Monitor', sioAddress: req.sioAddress });
};
