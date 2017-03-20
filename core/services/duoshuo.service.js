var Duoshuo = require('duoshuo');
var bluebird = require('bluebird');
var contentService = require('./contents.service');
var es = require('elasticsearch');
var bodybuilder = require('bodybuilder');
// var htmlana = require('crawler-html-analysis');
var duoshuo = new Duoshuo({
    short_name: 'bebewiki',
    secret: 'b31d2df971b59d1aea796fa21b808018'
});

exports.signin = duoshuo.signin;
exports.auth = bluebird.promisify(duoshuo.auth).bind(duoshuo);
exports.userInfo = function() {
    return function(req, res, next) {
        if (!req.session.user) return next();
        var client = duoshuo.getClient(req.session.user.access_token);

        if (!client) return next();
        client.get('users/profile.json', {
            qs: {
                user_id: req.session.user.user_id
            }
        }, function(err, res1, body) {
            if (!err) {
                res.locals.userDetail = body;
            }
            next();
        });
    }
};
exports.sso = function(req) {
    var from = encodeURIComponent("/login/?from=" + req.protocol + "://" + req.headers.host + req.originalUrl);

    return {
        qq: "http://bebewiki.duoshuo.com/login/qq/?sso=1&redirect_uri=" + from,
        weibo: "http://bebewiki.duoshuo.com/login/weibo/?sso=1&redirect_uri=" + from,
        weixin: "http://bebewiki.duoshuo.com/login/weixin/?sso=1&redirect_uri=" + from
    };
}

// function importsa(client, response) {
//     total += response.hits.hits.length;
//     console.log(response._scroll_id);
//     client.scroll({
//         scrollId: response._scroll_id,
//         scroll: '30s'
//     }, importsa.bind(client));
// }

exports.importContent = function() {
    let total = 0;
    var client = new es.Client({
        host: `106.75.78.203:9200`,
        log: [{
            type: 'stdio',
            levels: ['error', 'warning']
        }]
    });

    return function(req, res, next) {
            client.search({
                index: 'ff.crawler.results',
                scroll: "30s",
                body: {}
            }, function getMoreUntilDone(error, response) {
                if (error) {
                    console.log(error);
                } else {
                    total += response.hits.hits.length;
                    response.hits.hits.forEach(function(hit) {
                        var data = {
                            alias: hit._id,
                            category: '58cbf0975e916a0f279023de',
                            content: hit._source.content,
                            user: req.session.user,
                            status: 'pushed',
                            tags: ["baby", "bebe", "健康"],
                            abstract: hit._source.title,
                            title: hit._source.title,
                            date: new Date(),
                            media: [],
                            extensions: {}
                        }
                        contentService.save({
                            // data: hit._source,
                            data: data
                        }, function(err, res) {
                            console.log(err, res, "保存完毕！！！！");
                        });
                    });
                }

                if (response.hits.total > total) {
                    client.scroll({
                        scrollId: response._scroll_id,
                        scroll: '30s'
                    }, getMoreUntilDone);
                } else {
                    console.log('数据导出完毕！！！');
                }
            });
            next();
        }
        // var client = new es.Client({
        //     host: `106.75.78.203:9200`,
        //     log: [{
        //         type: 'stdio',
        //         levels: ['error', 'warning']
        //     }]
        // });

    // var body = bodybuilder()
    //     .query('regexp', 'path', 'health')
    //     .query('term', 'statusCode', 200)
    //     .from(0)
    //     .size(10)
    //     .build()

    // return function(req, res, next) {
    //     var allTitles = [];

    //     client.search({
    //         index: 'ff.crawler.urls',
    //         scroll: "30s",
    //         body: body
    //     }, function getMoreUntilDone(error, response) {
    //         if (error) {

    //         } else {
    //             response.hits.hits.forEach(function(hit) {
    //                 var ctx = { config: config, queueItem: hit._source, body: {} };

    //                 htmlana.default({})(ctx, function() {
    //                     ctx.body.htmlAnalysis && ctx.queueItem.analysisResult.forEach(function(analysis) {
    //                         client.create({
    //                             index: 'ff.crawler.results',
    //                             type: config.key,
    //                             id: hit._id,
    //                             body: analysis.result
    //                         });
    //                     });
    //                 });
    //             });
    //         }

    //         console.log(response._scroll_id);

    //         if (response.hits.total > allTitles.length) {
    //             client.scroll({
    //                 scrollId: response._scroll_id,
    //                 scroll: '30s'
    //             }, getMoreUntilDone);
    //         } else {
    //             console.log('every "test" title', allTitles);
    //         }
    //     });

    //     next();
    // }
}