const https = require('https');
const express = require('express');
var getIP = require('ipware')().get_ip;
const fs = require('fs')
var crypto = require("crypto");
const uuid = require('uuid');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const app = express();
const nodemailer = require("nodemailer");
const config = require("./config.json")
const fetch = require('node-fetch');
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

let start_date = new Date();;
let date = ("0" + start_date.getDate()).slice(-2);
let month = ("0" + (start_date.getMonth() + 1)).slice(-2);
let year = start_date.getFullYear();
let hours = start_date.getHours();
let minutes = start_date.getMinutes();
if (hours < 10) { hours = "0" + hours }
if (minutes < 10) { minutes = "0" + minutes }
const start_time = year + "-" + month + "-" + date

function logger(msg) {
  let date_ob = new Date();
  let date = ("0" + date_ob.getDate()).slice(-2);
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
  if (seconds < 10) { seconds = "0" + seconds }
  if (hours < 10) { hours = "0" + hours }
  if (minutes < 10) { minutes = "0" + minutes }
  console.log('[' + year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds + '] ' + msg)
  fs.appendFileSync('logs/' + start_time + '.log', '[' + year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds + '] ' + msg + '\n')
  fs.appendFileSync('logs/latest.log', '[' + year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds + '] ' + msg + '\n')
}

logger(" [INFO] The API is starting...")

const PORT = 400
var mysql = require('mysql');
var connection = mysql.createConnection({
  host: config.mysql_host,
  user: config.mysql_usr,
  password: config.mysql_passwd,
  database: config.mysql_db
});

exports.uuid = uuid
exports.fetch = fetch
exports.crypto = crypto
exports.bcrypt = bcrypt
exports.parser = bodyParser
exports.logger = logger
exports.con = connection
exports.ip = getIP
exports.httpsAgent = httpsAgent

logger(`   



  ███╗   ███╗███████╗██████╗  ██████╗██╗   ██╗██████╗ ██╗   ██╗     ██████╗██╗      ██████╗ ██╗   ██╗██████╗      █████╗ ██████╗ ██╗
  ████╗ ████║██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝    ██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗    ██╔══██╗██╔══██╗██║
  ██╔████╔██║█████╗  ██████╔╝██║     ██║   ██║██████╔╝ ╚████╔╝     ██║     ██║     ██║   ██║██║   ██║██║  ██║    ███████║██████╔╝██║
  ██║╚██╔╝██║██╔══╝  ██╔══██╗██║     ██║   ██║██╔══██╗  ╚██╔╝      ██║     ██║     ██║   ██║██║   ██║██║  ██║    ██╔══██║██╔═══╝ ██║
  ██║ ╚═╝ ██║███████╗██║  ██║╚██████╗╚██████╔╝██║  ██║   ██║       ╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝    ██║  ██║██║     ██║
  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝        ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝     ╚═╝  ╚═╝╚═╝     ╚═╝`);
connection.connect(function (err) {
  if (err) {
    logger(` [ERROR] Database error !\n  ${err.stack}`);
    process.exit(1);
  }
  logger(` [INFO] Database succefull connected ! (${connection.threadId})`);

  function services_action_logger(service_id, uuid, ip, action) {
    var sql = `INSERT INTO services_logs (service_id, timestamp, uuid, ip, action) VALUES('${service_id}', '${Date.now()}', '${uuid}', '${ip}', '${action}')`;
    connection.query(sql, function (err, result) {
      if (err) { server.logger(" [ERROR] Database error\n  " + err) };
    });
  }
  exports.services_action_logger = services_action_logger


  fetch(`${config.proxmox_url}/api2/json/access/ticket?username=${config.proxmox_user}&password=${config.proxmox_passwd}`, {
    "method": "POST",
    "headers": {
    },
    "body": "",
    "agent": httpsAgent
  }).then((response) => response.json())
    .then((data) => {
      const proxmox_ticket = data.data.ticket
      const proxmox_CSRFPreventionToken = data.data.CSRFPreventionToken
      exports.proxmox_ticket = proxmox_ticket
      exports.proxmox_CSRFPreventionToken = proxmox_CSRFPreventionToken
      logger(" [INFO] Proxmox API loaded ! (" + data.data.username + ")");
      let mail_transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_ssl,
        auth: {
          user: config.smtp_username,
          pass: config.smtp_pswd
        }
      })
      exports.mail_transporter = mail_transporter
      logger(" [INFO] SMTP Client loaded ! (" + config.smtp_host + ":" + config.smtp_port + ")");
      app.use((req, res, next) => {
        res.append('Access-Control-Allow-Origin', ['*']);
        res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.append('Access-Control-Allow-Headers', 'Content-Type');
        next();
        bodyParser.json();
      });
      app.use(require('./utils/rate-limit'));
      // app.use(require('./utils/sql-injection'));

      // index //
      app.use('/api/', require('./routes/index'));

      // products //
      app.use('/api/products/ptero-create-product', require('./routes/products/ptero-create-product'));
      app.use('/api/products/proxmox-create-product', require('./routes/products/proxmox-create-product'));
      app.use('/api/products/proxmox-qemu-list', require('./routes/products/proxmox-qemu-list'));
      app.use('/api/products/proxmox-nodes-list', require('./routes/products/proxmox-nodes-list'));
      app.use('/api/products/proxmox-storage-list', require('./routes/products/proxmox-storage-list'));
      app.use('/api/products/delete-product', require('./routes/products/delete-product'));
      app.use('/api/products/product-info', require('./routes/products/product-info'));
      app.use('/api/products/products', require('./routes/products/products'));
      app.use('/api/products/edit-product', require('./routes/products/edit-product'));

      // users //
      app.use('/api/users/create-user', require('./routes/users/create-user'));
      app.use('/api/users/login-user', require('./routes/users/login-user'));
      app.use('/api/users/users-list', require('./routes/users/users-list'));
      app.use('/api/users/user-info', require('./routes/users/user-info'));
      app.use('/api/users/username-exist', require('./routes/users/username-exist'));
      app.use('/api/users/mail-exist', require('./routes/users/mail-exist'));
      app.use('/api/users/delete-user', require('./routes/users/delete-user'));
      app.use('/api/users/edit-user', require('./routes/users/edit-user'));

      // roles //
      app.use('/api/roles/create-role', require('./routes/roles/create-role'));
      app.use('/api/roles/delete-role', require('./routes/roles/delete-role'));
      app.use('/api/roles/roles-list', require('./routes/roles/roles-list'));
      app.use('/api/roles/role-info', require('./routes/roles/role-info'));
      app.use('/api/roles/role-edit', require('./routes/roles/role-edit'));


      // services //
      app.use('/api/services', require('./routes/services/services'));
      app.use('/api/services/:service_name', require('./routes/services/infos/service-info'));
      app.use('/api/services/:service_name/files', require('./routes/services/infos/files/service-files'));



      // utils //
      app.use('/api/utils/send-mail', require('./routes/utils/send-mail'));

      app.listen(PORT, () => {
        logger(` [INFO] MercuryCloud API listening on ${config.api_url} !`)
      }
      );
    }).catch((error) => {
      logger(" [ERROR] Proxmox API error : " + error);
      process.exit(1);
    });
});