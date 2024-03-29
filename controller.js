'use strict';

const response = require('./res');
const connection = require('./conn');
const request = require('request');

exports.index = (req, res) => {
    res.sendFile( __dirname + "/public/" + "index.html" );
};

exports.notFoundPage = (req, res) => {
    response.notFound(res);
};

exports.loginUser = (req, res) => {
    const sql = "SELECT * FROM `users_list` WHERE `user_tel` = ?";
    const userTel = req.body.user_tel;
    const OTP_ACCOUNT = "numb_brianra4";
    const OTP_PASSWORD = "123456";
    
    function generateOtpUrl(numbers, content) {
        content = encodeURIComponent(content.trim());
        return "http://103.81.246.59:20003/sendsms?account=" + OTP_ACCOUNT + "&password=" + OTP_PASSWORD + "&numbers=" + numbers + "&content=" + content;
    }

    function generateOtpMessage(otp) {
        return "(TAMAGO) JANGAN BAGIKAN KODE INI KEPADA SIAPAPUN. Kode verifikasi OTP Tamago Anda adalah " + otp;
    }

    connection.query(sql, [userTel], function (error, rows, fields){
        if (error){
            console.log(error);
            response.error(error, res);
        } else {
            if (rows.length == 1) {
                const userId = rows[0].user_id;

                // send OTP
                var otpError;
                const otp = Math.floor(100000 + Math.random() * 900000);
                //console.log("OTP for " + userTel + " is " + otp);

                request(generateOtpUrl(userTel, generateOtpMessage(otp)), function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    //console.log(body);
                    if (body.success != 0) {
                        otpError = false;
                    } else if (body.fail != 0) {
                        otpError = true;
                    }
                }
                });

                if (!otpError) {
                    response.ok("OTP sent successfully", res);
                } else {
                    response.ok("OTP send failed", res);
                }

                // update OTP
                const sql = "UPDATE `users_list` SET `latest_otp` = '?' WHERE `users_list`.`user_id` = ?;"
                connection.query(sql, [otp, userId]);

            } else if (rows.length == 0) {
                // register user
                response.notFound(res);
            }
        }
    });
};

exports.verifyOtp = (req, res) => {
    const sql = "SELECT `user_id`, `user_name`, `user_tel`, `user_email`, `user_type` FROM `users_list` WHERE `user_tel` = ? AND `latest_otp` = ?";
    const userTel = req.body.user_tel;
    const otp = req.body.otp;

    connection.query(sql, [userTel, otp], function (error, rows, fields){
        if (error){
            console.log(error);
            response.error(error, res);
        } else {
            if (rows.length == 1) {
                const userId = rows[0].user_id;
                response.ok(rows[0], res);
            } else if (rows.length == 0) {
                response.error("Data supplied not sufficient", res);
            }
        }
    });
};

exports.newUser = (req, res) => {
    const name = req.body.user_name;
    const tel = req.body.user_tel;

    if (name == null || tel == null) {
        response.error("Data supplied not sufficient", res);
    } else {
        const sql = 'SELECT * FROM `users_list` WHERE `user_tel` = ?';
        connection.query(sql, [tel], function (error, rows){
            if(rows.length >= 1) {
                response.error("User already exist", res);
            } else {
                const sql = 'INSERT INTO `users_list` (`user_name`, `user_tel`, `user_type`) VALUES (?, ?, 1)';
                connection.query(sql, [name, tel], function (error, rows){
                    if(error){
                        console.log(error);
                        response.error(error, res);
                    } else{
                        response.ok("Registration completed.", res)
                    }
                });
            }
        });
    }
};

exports.newChild = (req, res) => {
    const parentId = req.body.parent_id;
    const name = req.body.child_name;
    const dob = req.body.child_dob; //YYYY-MM-DD
    const initialSaving = req.body.child_initial_saving;
    const dailyLimit = req.body.child_daily_limit;
    const avatar = req.body.child_avatar_type;
    const gender = req.body.child_gender; //1 cowo, 2 cewe
    const relation = req.body.parent_relation;

    if (name == null || dob == null || initialSaving == null || dailyLimit == null || avatar == null || gender == null) {
        response.error("Data supplied not sufficient", res);
    } else {
        const sql = 'INSERT INTO `children_list` (`child_name`, `child_dob`, `child_avatar`, `child_gender`, `child_savings`, `child_daily_limit`) VALUES (?, ?, ?, ?, ?, ?)';
        connection.query(sql, [name, dob, avatar, gender, initialSaving, dailyLimit], function (error, rows) {
            if(error){
                console.log(error);
                response.error(error);
            } else {
                var childId = rows.insertId;
                var sql = 'INSERT INTO `parent_child_connection` (`pc_conn_parent`, `pc_conn_child`, `parent_relation`) VALUES (?, ?, ?)';
                connection.query(sql, [parentId, childId, relation], function (error, rows) {
                    if(error){
                        console.log(error);
                        response.error(error, res);
                    } else{
                        response.ok("Registration completed.", res);
                    }
                });
            }
        });
    }
};

exports.newChildRelation = (req, res) => {
    const childId = req.body.child_id;
    const parentId = req.body.parent_id;
    const relation = req.body.parent_relation;

    if (childId == null || parentId == null || relation == null) {
        response.error("Data supplied not sufficient", res);
    } else {
        const sql = 'INSERT INTO `parent_child_connection` (`pc_conn_parent`, `pc_conn_child`, `parent_relation`) VALUES (?, ?, ?)';
        connection.query(sql, [parentId, childId, relation], function (error, rows) {
            if(error){
                console.log(error);
                response.error(error, res);
            } else{
                response.ok("Link completed.", res);
            }
        });
    }
};

exports.getChildrenList = (req, res) => {
    const parentId = req.body.parent_id;

    if (parentId == null) {
        response.error("Data not sufficient", res);
    } else {
        const sql = "SELECT * FROM `children_list` WHERE `child_id` = (SELECT `pc_conn_child` FROM `parent_child_connection` WHERE `pc_conn_parent` = ?)";
        connection.query(sql, [parentId], function (error, rows, fields){
            if(error){
                console.log(error);
                response.error(error, res);
            } else{
                response.ok(rows, res);
            }
        });

    }
}

exports.getTaskList = (req, res) => {
    const childId = req.body.child_id;

    if (childId == null) {
        response.error("Data not sufficient", res);
    } else {
        const sql = "SELECT * FROM `child_task_list` WHERE `task_child_id` = ?";
        connection.query(sql, [childId], function (error, rows, fields){
            if(error){
                console.log(error);
                response.error(error, res);
            } else{
                response.ok(rows, res);
            }
        });

    }
}

exports.newTask = (req, res) => {
    const taskName = req.body.task_name;
    const taskDetail = req.body.task_detail;
    const childId = req.body.child_id;
    const parentId = req.body.parent_id;
    const rewardWallet = req.body.task_reward_wallet;
    const rewardEggs = req.body.task_reward_eggs;
    const taskExpiry = req.body.task_expiry;

    if (taskName == null || taskDetail == null || childId == null || parentId == null || rewardWallet == null || rewardEggs == null || taskExpiry == null) {
        response.error("Data supplied not sufficient", res);
    } else {
        const sql = 'INSERT INTO `child_task_list` (`task_name`, `task_child_id`, `task_detail`, `task_parent_id`, `task_reward_wallet`, `task_reward_eggs`, `task_expiry`) VALUES (?, ?, ?, ?, ?, ?, ?)';
        connection.query(sql, [taskName, childId, taskDetail, parentId, rewardWallet, rewardEggs, taskExpiry], function (error, rows){
            if(error){
                console.log(error)
                response.error(error, res)
            } else{
                response.ok("Add new task success.", res)
            }
        });
    }
};