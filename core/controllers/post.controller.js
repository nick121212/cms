// var Duoshuo = require('duoshuo')

// var duoshuo = new Duoshuo({
//     short_name: 'bebewiki', // 站点申请的多说二级域名。
//     secret: 'b31d2df971b59d1aea796fa21b808018' // 站点密钥
// })

// // Auth
// duoshuo
//     .auth(0)
//     .then(function(access_token) {
//         console.log(access_token)
//     }).catch(function(err) {
//         console.error(err)
//     })

// // 通过duoshuo.auth获得的access_token
// var access_token = 'xxxxxxxxxxxxxxxxxx'
// var client = duoshuo.getClient(access_token)

// // Join local user to duoshuo.com
// client.join({
//     user: {},
// }).then(function(user) {
//     console.log(user)
// }).catch(function(err) {
//     console.log(err)
// })

// // Fetch top articles
// client.tops({
//     range: 'daily', // 获取本日，详见：http://dev.duoshuo.com/docs/50398b4b8551ece011000023
//     num_items: 10 // 获取10篇
// }).then(function(err, threads) {
//     console.log(threads)
// })

// // Push comments to duoshuo.com
// client.comment({
//     message: '我的一条新匿名评论'
// }).then(function(err, comment) {
//     console.log(comment)
// })