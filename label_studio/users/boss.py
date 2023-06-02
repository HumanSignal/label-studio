import json
from django.shortcuts import render
import jwt
import logging

from time import time
from authlib.integrations.django_client import OAuth
from django.http import HttpResponse, HttpResponseRedirect
from django.contrib.auth.models import Group
from django.contrib.auth import login
from django.conf import settings
from urllib.parse import urljoin
from django.urls import reverse
from django.shortcuts import redirect

from users.models import User

logger = logging.getLogger('default')

oauth = OAuth()
oauth.register("boss", **settings.OAUTH_APP_CONFIG["boss"])


def boss_login(request):
    if settings.SERVER_HOST:
        redirect_uri = urljoin(settings.SERVER_HOST, '/user/oauth-authorized/boss/')
    else:
        # build a full authorize callback uri
        redirect_uri = request.build_absolute_uri('/user/oauth-authorized/boss/')
    return oauth.boss.authorize_redirect(request, redirect_uri)

def oauth_authorized(request):
    logger.info("Authorized init")
    try:
        resp = oauth.boss.authorize_access_token(request)
        if resp is None:
            logger.error("You denied the request to sign in.", "warning")
            return render(request, 'login.html', context={"error_msg": f"boss账号异常"})
    except Exception as e:
        logger.error(f"获取token失败 {str(e)}")
        return render(request, 'login.html', context={"error_msg": f"请返回首页重新登录"})
    try:
        me = oauth.boss.get(f"/boss/openapi/user/info?permission={settings.BOSS_PERMISSION_CODE}", token=resp)
        userinfo = json.loads(me.text)
    except Exception as e:
        logger.error(f"获取用户详情失败 {str(e)}, {resp}")
        return render(request, 'login.html', context={"error_msg": f"获取用户详情失败 {str(e)}"})
    if userinfo.get("errorCode"):
        logger.error(f"用户权限检查失败 {userinfo}")
        return render(request, 'login.html', context={"error_msg": "BOSS权限不足，无法访问平台"})
    next_page = request.GET.get('next')
    next_page = next_page if next_page else reverse('projects:project-index')
    return boss_auth(userinfo, request, next_page)

def boss_auth(userinfo, request, next_page):
    """校验boss登录的用户还有钉钉id"""
    # 确认用户是否已经存在
    user = User.objects.filter(ding_user_id=userinfo.get("dingUserId")).first()
    if not user:
        # 用户不存在则初始化该用户
        logger.info("User info from XTransfer Boss First Login: {0}".format(userinfo))
        user = User(
            first_name=userinfo.get("nick", "神秘人"),
            last_name="",
            ding_user_id=userinfo.get("dingUserId"),
            username=userinfo.get("username"),
            email=userinfo.get("email"),
            boss_id=userinfo.get("userId", "")
        )
        user.set_password("labelstudio20230519")
        user.save()
        from organizations.models import Organization
        if Organization.objects.exists():
            org = Organization.objects.first()
            org.add_user(user)
        else:
            org = Organization.create_organization(created_by=user, title='Label Studio')
        user.active_organization = org
        user.save(update_fields=['active_organization'])
        init_user(user)
    request.advanced_json = {
        'email': user.email, 'allow_newsletters': user.allow_newsletters,
        'update-notifications': 1, 'new-user': 1
    }
    redirect_url = next_page if next_page else reverse('projects:project-index')
    request.session['last_login'] = time()
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    return redirect(redirect_url)


def init_user(user, role_name=settings.DEFAULT_GROUPS):
    """
    给用户关联默认资源组和权限组(目前和ldap的初始化逻辑一致)
    :param user:
    :return:
    """
    # 添加到默认权限组
    [user.groups.add(group) for group in Group.objects.filter(name=role_name)]
