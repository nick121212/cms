var logger = require('../../lib/logger.lib');
var sha1 = require('../services/sha1.service');
var usersService = require('../services/users.service');
var captcha = require('../../lib/captcha.lib');
var duoshuo = require('../services/duoshuo.service');

/**
 * 检查是否登陆
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
exports.check = function(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({
            error: {
                code: 'NOT_LOGGED_IN',
                message: '没有登录'
            }
        });
    }
};

/**
 * 登陆验证码
 * @param {Object} req
 * @param {Object} res
 */
exports.captcha = function(req, res) {
    var source = captcha();

    req.session.captcha = source.code;

    res.status(200).json(source.dataURL);
};

/**
 * 登陆
 * @param {Object} req
 * 				{String} req.body.email
 * 				{String} req.body.password
 * @param {Function} res
 */
exports.signIn = function(req, res) {
    req.checkBody({
        'email': {
            notEmpty: {
                options: [true],
                errorMessage: 'email 不能为空'
            },
            isEmail: { errorMessage: 'email 格式不正确' }
        },
        'captcha': {
            notEmpty: {
                options: [true],
                errorMessage: 'captcha 不能为空'
            },
            isLength: {
                options: [4, 4],
                errorMessage: '验证码长度需为 4 位'
            }
        },
        'password': {
            notEmpty: {
                options: [true],
                errorMessage: 'password 不能为空'
            },
            isLength: {
                options: [6],
                errorMessage: 'password 不能小于 6 位'
            }
        },
        'autoSignIn': {
            notEmpty: {
                options: [true],
                errorMessage: 'autoSignIn 不能为空'
            },
            isBoolean: { errorMessage: 'autoSignIn 需为布尔值' }
        }
    });

    var email = req.body.email;
    var password = req.body.password;
    var captcha = req.body.captcha;
    var autoSignIn = req.body.autoSignIn;

    if (req.validationErrors()) {
        logger.system().error(__filename, '参数验证失败', req.validationErrors());
        return res.status(400).end();
    }

    if (captcha !== req.session.captcha) {
        res.status(401).json({
            error: {
                code: 'WRONG_CAPTCHA',
                message: '验证码错误'
            }
        });
        return false;
    }

    usersService.one({ email: email, selectPassword: true }, function(err, user) {
        if (err) {
            logger[err.type]().error(__filename, err);
            return res.status(500).end();
        }

        if (user && sha1(password) === user.password) {
            delete req.session.captcha;
            req.session.user = user._id;
            if (autoSignIn) req.session.cookie.maxAge = 60 * 1000 * 60 * 24 * 90;

            res.status(204).end();
        } else {
            res.status(401).json({
                error: {
                    code: 'WRONG_EMAIL_OR_PASSWORD',
                    message: '用户名或密码错误'
                }
            });
        }
    });
};

/**
 * 注销登陆
 * @param {Object} req
 * @param {Object} res
 */
exports.signOut = function(req, res) {
    req.session.destroy(function(err) {
        if (err) {
            logger.system().error(__filename, err);
            return res.status(500).end();
        }

        res.status(204).end();
    });
};

/**
 * 查询当前账号
 * @param {Object} req
 * @param {Object} res
 */
exports.current = function(req, res) {
    if (req.session.user) {
        usersService.one({ _id: req.session.user }, function(err, user) {
            if (err) {
                logger.database().error(__filename, err);
                return res.status(400).end();
            }

            res.status(200).json(user);
        });
    } else {
        res.status(401).json({
            error: {
                code: 'NOT_LOGGED_IN',
                message: '没有登录'
            }
        });
    }
};

/**
 * 更新账号
 * @param {Object} req
 * 				{String} req.body.email
 * 				{String} req.body.nickname
 * 				{String} req.body.password
 * @param {Function} res
 */
exports.update = function(req, res) {
    req.checkBody({
        'email': {
            notEmpty: {
                options: [true],
                errorMessage: 'email 不能为空'
            },
            isEmail: { errorMessage: 'email 格式不正确' }
        },
        'nickname': {
            notEmpty: {
                options: [true],
                errorMessage: 'nickname 不能为空'
            },
            isString: { errorMessage: 'nickname 需为字符串' }
        },
        'password': {
            optional: true,
            isString: { errorMessage: 'password 需为字符串' },
            isLength: {
                options: [6],
                errorMessage: 'password 不能小于6位'
            }
        }
    });

    if (req.validationErrors()) {
        logger.system().error(__filename, req.validationErrors());
        return res.status(400).end();
    }

    var data = {
        nickname: req.body.nickname,
        email: req.body.email
    };

    if (req.body.password) data.password = sha1(req.body.password);

    usersService.save({ _id: req.session.user, data: data, userSelf: true }, function(err) {
        if (err) {
            logger[err.type]().error(__filename, err);
            return res.status(400).end();
        }

        res.status(204).end();
    });
};

exports.login = function(req, res) {
    duoshuo.auth(req.query.code).then(function(userInfo) {
        req.session.user = userInfo;
        res.redirect(req.query.from || "/");
    }).catch(function(err) {
        logger.system().error(__filename, err);
        res.status(401).json({
            error: {
                code: 'WRONG_EMAIL_OR_PASSWORD',
                message: err.message
            }
        });
    });
}

exports.logout = function(req, res) {
    req.session.user = null;
    req.session.destroy(function(err) {
        if (err) {
            logger.system().error(__filename, err);
            return res.status(500).end();
        }

        // res.status(204).end();

        res.redirect("/");
    });
}