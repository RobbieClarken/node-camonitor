exports.index = function(req, res){
  res.render('index', { title: 'CA Monitor', config: req.config });
};
