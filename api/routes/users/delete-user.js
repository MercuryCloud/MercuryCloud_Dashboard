var router = require('express').Router();
const server = require('../../server.js')
var jsonParser = server.parser.json()
const permissions_manager = require("../../utils/permissions-manager")
server.logger(" [INFO] /api/users/delete-user route loaded !")

router.delete('', jsonParser, function (req, res) {
    ipInfo = server.ip(req);
    var response = "OK"
    var error = false
    var sql = `SELECT token FROM users WHERE uuid = '${req.query.uuid}'`;
    server.con.query(sql, function (err, result) {
      if (err) {server.logger(" [ERROR] Database error\n  " + err)};
      if (result.length == 0) {
        returnres.json({'error': true, 'code': 404})
      } else {
        if (result[0].token === req.query.token) {
          permissions_manager.has_permission(req.query.uuid, "DELETEUSER").then(function(result) {
            if (result) {
              var sql = `DELETE FROM users WHERE uuid='${req.body.user_uuid}'`;
              server.con.query(sql, function (err, result) {
                  if (err) {server.logger(" [ERROR] Database error\n  " + err), error = true, response = "Database error"};
              });
              server.logger(" [DEBUG] User " + req.body.user_uuid + " deleted by " + req.query.uuid + " !")
              return res.json({"error": error, "response": response});
            } else {
              return res.json({
                "error": true,
                "code": 403
              })
            }
          })
        } else {
          return res.json({'error': true, 'code': 403})
        }
      }
    });
  })

module.exports = router;