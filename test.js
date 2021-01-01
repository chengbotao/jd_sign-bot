/*
 * @Author: Chengbotao
 * @Description: 
 * @Date: 2021-01-01 21:44:28
 * @LastEditTime: 2021-01-01 21:46:37
 * @LastEditors: Chengbotao
 * @FilePath: \jd_sign_bot\test.js
 */
const exec = require('child_process').execSync;
const fs = require('fs');
const rp = require('request-promise');
const download = require('download');

// 企业微信必要的参数
const corpid = process.env.CORP_ID, // 企业微信ID
  agentid = Number(process.env.AGENT_ID), // 企业微信自建应用的id
  corpsecret = process.env.CORP_SECRET; // 企业微信自建应用的secret

// 京东： [企业微信员工ID ： 京东的登录cookie]
const JDUsers = {
  "ChengBoTao": process.env.JD_COOKIE,
  // "MaXiaoTian": process.env.JD_COOKIE_2
}

async function downFile() {
  // const url = 'https://cdn.jsdelivr.net/gh/NobyDa/Script@master/JD-DailyBonus/JD_DailyBonus.js'
  const url = 'https://raw.githubusercontent.com/NobyDa/Script/master/JD-DailyBonus/JD_DailyBonus.js';
  await download(url, './');
}

async function changeFile(key) {
  let content = await fs.readFileSync('./JD_DailyBonus.js', 'utf8')
  content = content.replace(/var Key = ''/, `var Key = '${key}'`);
  await fs.writeFileSync('./JD_DailyBonus.js', content, 'utf8')
}

async function getAccessToken() { // 获取企业微信自建应用 access_token
  const options = {
    method: 'GET',
    uri: ` https://qyapi.weixin.qq.com/cgi-bin/gettoken`,
    qs: {
      corpid: corpid,
      corpsecret: corpsecret
    },
    json: true
  }
  let res = await rp(options);
  if (res.errcode != 0) return;
  return res.access_token;
}

async function sendNotify(name, msg, accessToken) {
  console.log("成员名字", name);
  const options = {
    method: 'POST',
    uri: `https://qyapi.weixin.qq.com/cgi-bin/message/send`,
    qs: {
      access_token: accessToken // -> uri + '?access_token=xxxxx%20xxxxx'
    },
    body: {
      "touser": name,
      // "toparty" : "PartyID1|PartyID2",
      //  "totag" : "TagID1 | TagID2",
      "msgtype": "text",
      "agentid": agentid,
      "text": {
        "content": msg
      },
      "safe": 0,
      "enable_duplicate_check": 0
    },
    json: true
  }
  let res = await rp(options);
  // 企业微信自建应用推送 access_token 失效，重新发送
  if (res.errcode === 40014) {
    console.log("重新发送")
    start(name);
  }
}

async function sendRequest(userName, jdCookie, accessToken) {
  if (!jdCookie) {
    console.log('请填写 jdCookie 后在继续')
    return
  }
  // 下载最新代码
  await downFile();
  console.log('下载代码完毕')
  // 替换变量
  await changeFile(jdCookie);
  console.log('替换变量完毕')
  // 执行
  await exec(`node JD_DailyBonus.js >> ${userName}-result.txt`);
  console.log('执行完毕')

  const path = `./${userName}-result.txt`;
  let content = "";
  if (await fs.existsSync(path)) {
    content = await fs.readFileSync(path, "utf8");
  }

  console.log("返回结果",content);

  let t = content.match(/【签到概览】:((.|\n)*)京东商城-京豆: /);
  let res = t ? t[1].replace(/\n/, '') : '🍔'

  let reg = /Cookie失效/ig
  let t2 = reg.test(content);

  let res2 = t2 ? "\n😂Cookie失效😂" : ''
  let notifyContent = `【签到概览】:${res}${res2}`;

  console.log("京东签到信息", notifyContent);

  await sendNotify(userName, notifyContent, accessToken);
}

async function start(params = null) {
  // 获取企业微信自建应用的 access_token
  let access_token = await getAccessToken();
  // 获取所有的用户
  let userNames = Object.keys(JDUsers);
  if (access_token) {
    let tempArr = userNames;
    if (params) {
      let num = userNames.findIndex(item => item === params);
      tempArr = userNames.slice(num)
    }
    for (const value of tempArr) {
      await sendRequest(value, JDUsers[value], access_token);
    }
  } else {
    console.log("获取 access_token 失败");
  }
}

start();
