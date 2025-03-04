# coding=UTF-8
import requests
host = 'https://imgurlocr.market.alicloudapi.com'
path = '/urlimages'
method = 'POST'
appcode = '03f3b7362a4e4d868be3d2b187addfdf'#开通服务后 买家中心-查看AppCode
querys = ''
bodys = {}
url = host + path
data = {'image':'data:image/png;base64,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'}
# 或者base64
# data = {'image':'data:image/jpeg;base64,/9j/4A......'}
header = {"Authorization":'APPCODE ' + appcode}
try:
    res = requests.post(url,data,headers=header)
except :
    print("URL错误")
    exit()
httpStatusCode = res.status_code

if(httpStatusCode == 200):
    print("正常请求计费(其他均不计费)")
    print(res.text)
else:
    httpReason = res.headers['X-Ca-Error-Message']
    if(httpStatusCode == 400 and httpReason == 'Invalid Param Location'):
        print("参数错误")
    elif(httpStatusCode == 400 and httpReason == 'Invalid AppCode'):
        print("AppCode错误")
    elif(httpStatusCode == 400 and httpReason == 'Invalid Url'):
        print("请求的 Method、Path 或者环境错误")
    elif(httpStatusCode == 403 and httpReason == 'Unauthorized'):
        print("服务未被授权（或URL和Path不正确）")
    elif(httpStatusCode == 403 and httpReason == 'Quota Exhausted'):
        print("套餐包次数用完")
    elif(httpStatusCode == 403 and httpReason == 'Api Market Subscription quota exhausted'):
        print("套餐包次数用完，请续购套餐")
    elif(httpStatusCode == 500 ):
        print("API网关错误")
    else:
        print("参数名错误 或 其他错误")
        print(httpStatusCode)
        print(httpReason)