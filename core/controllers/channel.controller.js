var async = require('async');
var _ = require('lodash');
var siteInfoService = require('../services/site-info.service');
var categoriesService = require('../services/categories.service');
var listsService = require('../services/lists.service');
var duoshuoService = require('../services/duoshuo.service');

/**
 * 频道
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
module.exports = function(req, res, next) {
    var channelPath = '/' + req.params.channel + req.params[0];

    categoriesService.one({
        path: channelPath,
        type: 'channel'
    }, function(err, category) {
        if (err) return res.status(500).end();

        if (!category) return next();

        async.parallel({
            siteInfo: siteInfoService.get,
            navigation: function(callback) {
                categoriesService.navigation({ current: channelPath }, callback);
            },
            lists: function(callback) {
                listsService.channel(category, callback);
            },
            localReadingTotal: function(callback) {
                listsService.reading({ path: channelPath }, callback);
            },
            localReadingDay: function(callback) {
                listsService.reading({ path: channelPath, sort: '-reading.day' }, callback);
            },
            localReadingWeek: function(callback) {
                listsService.reading({ path: channelPath, sort: '-reading.week' }, callback);
            },
            localReadingMonth: function(callback) {
                listsService.reading({ path: channelPath, sort: '-reading.month' }, callback);
            }
        }, function(err, results) {
            res.render(_.get(category, 'views.channel'), {
                layout: _.get(category, 'views.layout'),
                siteInfo: results.siteInfo,
                navigation: results.navigation,
                category: category,
                currentUser: req.session.user,
                sso: duoshuoService.sso(req),
                lists: results.lists,
                readingList: {
                    total: results.localReadingTotal,
                    day: results.localReadingDay,
                    week: results.localReadingWeek,
                    month: results.localReadingMonth
                }
            });
        });
    });
};