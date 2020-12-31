#

#
# Author: Hovhannes Atoyan (hovhannes.atoyan@gmail.com)
#

import os
import time
import datetime
import unittest
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.firefox_binary import FirefoxBinary
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains


class myTestCase(unittest.TestCase):
    def setUp(self):
        # self.driver = webdriver.Firefox()
        #
        self.downloadDir = './'
        fp = webdriver.FirefoxProfile()
        fp.set_preference("browser.download.folderList", 2)
        fp.set_preference("browser.download.manager.showWhenStarting", False)
        fp.set_preference("browser.download.dir", self.downloadDir)
        # fp.set_preference("browser.helperApps.neverAsk.saveToDisk", "attachment/csv")
        # fp.set_preference("browser.helperApps.neverAsk.saveToDisk", "attachment/json")
        fp.set_preference("browser.helperApps.neverAsk.saveToDisk", "attachment/zip")
        self.driver = webdriver.Firefox(firefox_profile=fp)
        #
        self.wait = WebDriverWait(self.driver, 10)
        self.probel5 = '      '
        #
        self.site_url = 'http://localhost:8080/welcome'
        #self.loginUrl = 'http://devshop.oneplanetops.com/customer/account/login/'
        #self.headerLoginBtn = '//div[@class="signin"]/a[contains(text(), " Sign In")]'
        #
        self.site_logo = '//a[@id="logo"]/img'
        self.welcome_Setup  = '//a[contains(text(), "Setup")]'
        self.welcome_Import = '//a[contains(text(), "Import")]'
        self.welcome_Start  = '//a[contains(text(), "Start")]'
        self.welcome_Export = '//a[contains(text(), "Export")]'
        #
        #self.Setup_label_car = '//span[contains(text(), "Car")]'
        #self.Setup_label_car = '//span[@class="ant-tag"]'
        #self.Setup_label_car = '//span[@class="ant-tag"][contains(text(), "Car")]'
        self.Setup_label_car = '/html/body/div/div/div/div/div/div/div[1]/div/div/div[2]/span[2]'
        #
        self.import_img_draganddrop_id = 'file-input'
        # self.import_img_draganddrop_text = '//p[contains(text(), "Drag and drop your files here or click for import")]'
        self.import_img_src = 'qa-resources/tmp_images/120825952_2800299673523323_2768303406576699097_n.jpg'
        #
        # self.start_label_car = '//span[contains(text(), "Car")]'
        self.start_submit_btn = '//button/span[contains(text(), "Submit ")]'
        #
        self.export_submit_btn = '//a[contains(text(), "Export Completions")]'
        

    def tearDown(self):
        self.driver.close()

    def test_cases(self):
        print("..... Opening the site "+self.site_url+" .....")
        self.driver.get(self.site_url)
        print("..... Executing Test-Cases .....\n")
        #
        # self.step1('Setup your label config')
        # self.goToWelcomePage()
        self.step2('Import tasks to project')
        self.goToWelcomePage()
        self.step3('Start labeling tasks')
        self.goToWelcomePage()
        self.step4('Export completions')
        self.goToWelcomePage()


    #Checks element existance by xpath
    def check_exists_by_xpath(self, xpath):
        try:
            self.driver.find_element_by_xpath(xpath)
        except NoSuchElementException:
            return False
        return True

    #Step1 - Setup your label config
    def step1(self, testCaseName):
        # Go to page Setup
        print("..... Going to page Setup .....")
        self.driver.find_element_by_xpath(self.welcome_Setup).click()
        time.sleep(2)
        #
        #Click on label Car
        #self.Setup_label_car = '//span[contains(text(), "Car")]'
        #self.Setup_label_car = '//sup[contains(text(), "[")][@class="Hint_main__1Svrz"]'
        #self.Setup_label_car = '//html/body/div/div/div/div/div/div/div[1]/div/div/div[2]/span[2]'
        # self.Setup_label_car = '//span[contains(text(), "Car")]'
        # self.Setup_label_car = '/html/body/div/div/div/div/div/div/div[1]/div/div/div[2]/span[1]'
        # self.driver.find_element_by_xpath(self.Setup_label_car).click()
        #
        
        # iframe_ = self.driver.find_elements_by_tag_name('iframe')[0]
        # iframe_ = self.driver.find_elements_by_tag_name('iframe')
        # iframe_ = self.driver.find_element_by_xpath('//iframe[@class="render-editor"]')
        # print(len(iframe_))
        self.Setup_label_car = '/html/body/div/div/div/div/div/div/div[1]/div/div/div[2]/span[1]'
        #
        # #self.driver.switch_to_window(iframe_)
        # self.driver.switch_to_frame('editor-iframe')
        # self.driver.switch_to_frame(iframe_)
        # #self.driver.switch_to.frame(self.driver.find_element_by_id('editor-iframe'))
        #iframe_ = self.driver.find_element_by_xpath('//iframe[contains(@srcdoc, "<html><head><!--EditorCSS--><linkhref=&quot;static/editor/css/main.a1b00718.css&quot;rel=&quot;stylesheet&quot;><!--EditorJS--><scriptsrc=&quot;static/editor/js/main.12760629.js&quot;></script><style>body::-webkit-scrollbar-track{-webkit-box-shadow:inset002pxrgba(178,178,178,0.3)!important;background-color:#F5F5F5!important;}body::-webkit-scrollbar{width:2px!important;height:2px!important;background-color:#F5F5F5!important;}body::-webkit-scrollbar-thumb{background-color:#c3c3c3!important;border:2pxsolid#b4b4b4!important;}#label-studiodiv[class^=&quot;App_editor&quot;],div[class*=&quot;App_editor&quot;]{width:98%!important;min-width:98%!important;max-width:98%!important;}#label-studio.ls-menu{width:100%;}#label-studio.ls-segment{top:0;}</style></head><body><scriptsrc=&quot;static/js/jquery.min.js&quot;></script><scriptsrc=&quot;static/js/lsf-sdk.js&quot;></script><!--Editor--><divclass=&quot;uicontent&quot;><divid=&quot;label-studio&quot;style=&quot;width:100%;&quot;><divclass=&quot;uiloaderactiveinlinecentered&quot;></div></div></div><script>window.onload=function(){vartask={&quot;id&quot;:42,&quot;data&quot;:{&quot;image&quot;:&quot;static\/samples\/sample.jpg&quot;},&quot;completions&quot;:null,&quot;predictions&quot;:null,&quot;project&quot;:1,&quot;created_at&quot;:&quot;2019-02-06T14:06:42.000420Z&quot;,&quot;updated_at&quot;:&quot;2019-02-06T14:06:42.000420Z&quot;};varLS=newLabelStudio(&quot;label-studio&quot;,{config:`<View><Headervalue=&quot;Selectlabelandstarttoclickonimage&quot;></Header><Imagename=&quot;image&quot;value=&quot;$image&quot;></Image><PolygonLabelsname=&quot;label&quot;toName=&quot;image&quot;strokeWidth=&quot;3&quot;pointSize=&quot;small&quot;opacity=&quot;0.9&quot;><Labelvalue=&quot;Airplane&quot;background=&quot;red&quot;></Label><Labelvalue=&quot;Car&quot;background=&quot;blue&quot;></Label></PolygonLabels></View>`,user:{pk:1,firstName:&quot;Awesome&quot;,lastName:&quot;User&quot;},task:_convertTask(task),interfaces:[&quot;basic&quot;,&quot;side-column&quot;,&quot;predictions&quot;],onLabelStudioLoad:function(LS){varc=LS.completionStore.addCompletion({userGenerate:true});LS.completionStore.selectCompletion(c.id);}});};</script></body></html>")]')
        iframe_ = self.driver.find_element_by_xpath(r'//iframe[@srcdoc, "<html><head><!--EditorCSS--><linkhref=&quot;static/editor/css/main.a1b00718.css&quot;rel=&quot;stylesheet&quot;><!--EditorJS--><scriptsrc=&quot;static/editor/js/main.12760629.js&quot;></script><style>body::-webkit-scrollbar-track{-webkit-box-shadow:inset002pxrgba(178,178,178,0.3)!important;background-color:#F5F5F5!important;}body::-webkit-scrollbar{width:2px!important;height:2px!important;background-color:#F5F5F5!important;}body::-webkit-scrollbar-thumb{background-color:#c3c3c3!important;border:2pxsolid#b4b4b4!important;}#label-studiodiv[class^=&quot;App_editor&quot;],div[class*=&quot;App_editor&quot;]{width:98%!important;min-width:98%!important;max-width:98%!important;}#label-studio.ls-menu{width:100%;}#label-studio.ls-segment{top:0;}</style></head><body><scriptsrc=&quot;static/js/jquery.min.js&quot;></script><scriptsrc=&quot;static/js/lsf-sdk.js&quot;></script><!--Editor--><divclass=&quot;uicontent&quot;><divid=&quot;label-studio&quot;style=&quot;width:100%;&quot;><divclass=&quot;uiloaderactiveinlinecentered&quot;></div></div></div><script>window.onload=function(){vartask={&quot;id&quot;:42,&quot;data&quot;:{&quot;image&quot;:&quot;static\/samples\/sample.jpg&quot;},&quot;completions&quot;:null,&quot;predictions&quot;:null,&quot;project&quot;:1,&quot;created_at&quot;:&quot;2019-02-06T14:06:42.000420Z&quot;,&quot;updated_at&quot;:&quot;2019-02-06T14:06:42.000420Z&quot;};varLS=newLabelStudio(&quot;label-studio&quot;,{config:`<View><Headervalue=&quot;Selectlabelandstarttoclickonimage&quot;></Header><Imagename=&quot;image&quot;value=&quot;$image&quot;></Image><PolygonLabelsname=&quot;label&quot;toName=&quot;image&quot;strokeWidth=&quot;3&quot;pointSize=&quot;small&quot;opacity=&quot;0.9&quot;><Labelvalue=&quot;Airplane&quot;background=&quot;red&quot;></Label><Labelvalue=&quot;Car&quot;background=&quot;blue&quot;></Label></PolygonLabels></View>`,user:{pk:1,firstName:&quot;Awesome&quot;,lastName:&quot;User&quot;},task:_convertTask(task),interfaces:[&quot;basic&quot;,&quot;side-column&quot;,&quot;predictions&quot;],onLabelStudioLoad:function(LS){varc=LS.completionStore.addCompletion({userGenerate:true});LS.completionStore.selectCompletion(c.id);}});};</script></body></html>"]')
        self.driver.switch_to.frame(iframe_)
        self.driver.find_element_by_xpath(self.Setup_label_car)
        time.sleep(5)
        #
        #Doing 3 clicks for create area
        action = webdriver.common.action_chains.ActionChains(self.driver)
        action.move_to_element_with_offset(self.driver.find_element_by_tag_name('body'), 0,0)
        #
        # el=self.driver.find_element_by_xpath('/html/body/div/div/div/div/div/div/div[1]/div/div/div[1]/div[2]/div/canvas')
        # action = webdriver.common.action_chains.ActionChains(self.driver)
        # action.move_to_element_with_offset(el, 500, 500)
        # action.click()
        # action.perform()
        #
        x = 700
        y = 300
        action.move_by_offset(x, y).click().perform()
        action.move_by_offset(x, y+50).click().perform()
        action.move_by_offset(x+30, y+30).click().perform()
        action.move_by_offset(x, y).click().perform()
        #
        #Go to outsite from iframe
        self.driver.switch_to_default_content()


    #Step2 - Import tasks to project
    def step2(self, testCaseName):
        # Go to page Import
        print("..... Going to page Import .....")
        self.driver.find_element_by_xpath(self.welcome_Import).click()
        #
        # Choose image for dragAndDrop
        print('Direktory is: ' + str(os.getcwd()))
        self.import_img_src = os.getcwd() +'/'+ self.import_img_src
        print('Image is: ' +str(self.import_img_src))
        self.driver.find_element_by_id(self.import_img_draganddrop_id).send_keys(self.import_img_src)
        print("Image choosed from system and placed into dragAndDrop area")
        #
        # Close 'Import status'
        import_status_close_btn = self.wait.until(EC.element_to_be_clickable((By.ID, "upload-done-button")))
        import_status_close_btn.click()
        print("Popup window with the name 'Import status' were closed ")
        # time.sleep(2)


    #Step3 - Start labeling tasks
    def step3(self, testCaseName):
        # Go to page Start
        print("..... Going to page Start .....")
        self.driver.find_element_by_xpath(self.welcome_Start).click()
        #
        # Click on Label Airplane
        # self.driver.find_element_by_xpath(self.start_label_car).click()
        label_car_btn = self.wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "ant-tag")))
        label_car_btn.click()
        #
        # Doing 3 clicks for create area
        actions = ActionChains(self.driver)
        x = 50
        y = 150
        actions.move_to_element_with_offset(self.driver.find_element_by_tag_name('body'), 0,0)
        actions.move_by_offset(x, y).click().perform()
        actions.move_to_element_with_offset(self.driver.find_element_by_tag_name('body'), 0,0)
        actions.move_by_offset(x, y+50).click().perform()
        actions.move_to_element_with_offset(self.driver.find_element_by_tag_name('body'), 0,0)
        actions.move_by_offset(x+50, y+30).click().perform()
        actions.move_to_element_with_offset(self.driver.find_element_by_tag_name('body'), 0,0)
        actions.move_by_offset(x, y).click().perform()
        print("Triangle were created via 4 time clicking on the picture")
        time.sleep(1)
        # Click on Submit
        self.driver.find_element_by_xpath(self.start_submit_btn).click()
        print("Labeled task submited")


    #Step4 - Export completions
    def step4(self, testCaseName):
        # Go to page Export
        print("..... Going to page Export .....")
        self.driver.find_element_by_xpath(self.welcome_Export).click()
        #
        # Click on Submit
        self.driver.find_element_by_xpath(self.export_submit_btn).click()
        print("Completion exported")
        time.sleep(3)


    #Go to Welcome page
    def goToWelcomePage(self):
        # Go to page Welcome
        print("..... Going to page Welcome .....")
        time.sleep(1)
        self.driver.find_element_by_xpath(self.site_logo).click()



'''
    #Check SignIn button existance and click on it
    def clickOnSignInBtn(self, testCaseName):
        print("----- Begin TestCase: "+testCaseName+" -----")
        if self.check_exists_by_xpath(self.headerLoginBtn):
            print(self.probel5+"SUCCESS: SignIn button presented on page")
            #self.driver.find_element_by_xpath(self.headerLoginBtn).click()
            self.clickSignInBtn()
        else:
            print(self.probel5+"ERROR: SignIn button "+str(self.headerLoginBtn)+" doesn't exists")
        print("----- END TestCase: "+testCaseName+" -----\n")

    #Inputs Email, inputs Password and clicks on SignIn button
    def doLogin(self, login, password):
        self.driver.find_element_by_xpath(self.inputEmail).clear()
        self.driver.find_element_by_xpath(self.inputPassword).clear()
        self.driver.find_element_by_xpath(self.inputEmail).send_keys(login)
        self.driver.find_element_by_xpath(self.inputPassword).send_keys(password)
        time.sleep(2)
        self.driver.find_element_by_xpath(self.submitVoiti).click()

    #Do LogOut
    def doLogOut(self, testCaseName):
        print("..... Doing Sign Out .....")
        #but_loc = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.XPATH, self.myAccountIcon))) #hover over button
        #ActionChains(self.driver).move_to_element(but_loc).perform()
        #sec_but = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.XPATH, self.myAccountHoverLogOut))) #click on contact
        #sec_but.click()
        #
        #but_loc = self.wait.until(EC.visibility_of_element_located((By.XPATH, self.myAccountIcon))) #hover over button
        #ActionChains(self.driver).move_to_element(but_loc).perform()
        #sec_but = self.wait.until(EC.visibility_of_element_located((By.XPATH, self.myAccountHoverLogOut))) #click on contact
        #sec_but.click()
        #
        loginButtonElement = self.wait.until(lambda driver: driver.find_element_by_xpath(self.myAccountIcon))
        loginButtonElement = self.wait.until(lambda driver: driver.find_element_by_xpath(self.myAccountHoverLogOut))
        time.sleep(5)


    #Login via incorrect Email and incorrect Password
    def tc1(self, testCaseName):
        print("----- Begin TestCase: "+testCaseName+" -----")
        self.doLogin(self.wrongUser, self.wrongPass)
        #time.sleep(5)
        currentUrl = self.driver.current_url
        if currentUrl == self.loginUrl:
        #if self.check_exists_by_xpath(self.wrongLoginPassMsgElement):
            print(self.probel5+"SUCCESS: Can't "+testCaseName)
        else:
            print(self.probel5+"ERROR: tc1=>It is possible to "+testCaseName)
        print("----- END TestCase: "+testCaseName+" -----\n")

    #Login via incorrect Email and correct Password
    def tc2(self, testCaseName):
        print("----- Begin TestCase: "+testCaseName+" -----")
        self.doLogin(self.wrongUser, self.truePass)
        time.sleep(5)
        currentUrl = self.driver.current_url
        if currentUrl == self.loginUrl:
        #if self.check_exists_by_xpath(self.wrongLoginPassMsgElement):
            print(self.probel5+"SUCCESS: Can't "+testCaseName)
        else:
            print(self.probel5+"ERROR: tc2=>It is possible to "+testCaseName)
        print("----- END TestCase: "+testCaseName+" -----\n")

    #Login via correct Email and incorrect Password
    def tc3(self, testCaseName):
        print("----- Begin TestCase: "+testCaseName+" -----")
        self.doLogin(self.trueUser, self.wrongPass)
        time.sleep(5)
        currentUrl = self.driver.current_url
        if currentUrl == self.loginUrl:
        #if self.check_exists_by_xpath(self.wrongLoginPassMsgElement):
            print(self.probel5+"SUCCESS: Can't "+testCaseName)
        else:
            print(self.probel5+"ERROR: tc3=>It is possible to "+testCaseName)
        print("----- END TestCase: "+testCaseName+" -----\n")

    #Login via correct Email and correct Password
    def tc4(self, testCaseName):
        print("----- Begin TestCase: "+testCaseName+" -----")
        self.doLogin(self.trueUser, self.truePass)
        currentUrl = self.driver.current_url
        if currentUrl == self.loginUrl:
            print(self.probel5+"ERROR: User hadn't logined")
        else:
            print(self.probel5+"SUCCESS: "+testCaseName)
        time.sleep(5)
        print("----- END TestCase: "+testCaseName+" -----\n")

    #Going to My Orders
    def goToMyOrders(self, testCaseName):
        print("..... "+testCaseName+" .....")
        self.driver.find_element_by_xpath(self.myOrdersLink).click()
        time.sleep(2)

    #Going to All Products page
    def goToAllProducts(self, testCaseName):
        print("..... "+testCaseName+" .....")
        self.driver.find_element_by_xpath(self.allProductsLink).click()
        time.sleep(2)

    #Click on Product
    def clickOnProduct(self, testCaseName):
        print("..... "+testCaseName+" .....")
        self.driver.find_element_by_xpath(self.productFromAllProducts).click()
        time.sleep(5)

    #Add choosed product to Cart
    def addChoosedProductToCart(self, testCaseName):
        print("..... "+testCaseName+" .....")
        #Choosing Color
        self.driver.find_element_by_xpath(self.choosedProductColor).click()
        #Choosing Size
        self.driver.find_element_by_xpath(self.choosedProductSize).click()
        #Choosing Quantity
        self.driver.find_element_by_xpath(self.choosedProductQuantity).click()
        time.sleep(2)
        #Click on ADD TO CART
        self.driver.find_element_by_xpath(self.choosedProductAddToCartBtn).click()
        #Close after AddToCart pop-up
        popupCloseIcon = '/html/body/div[2]/div/div[1]/div[2]/button'
        self.wait.until(EC.element_to_be_clickable((By.XPATH, popupCloseIcon))).click()
        #
        #alert_obj = self.driver.switch_to.alert
        #alert_obj.dismiss()
        time.sleep(5)

    #Going to MyAccount
    def goToMyAccount(self, testCaseName):        
        #but_loc = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.XPATH, self.myAccountIcon)))#hover over button
        #ActionChains(self.driver).move_to_element(but_loc).perform()
        #sec_but = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.XPATH, self.myAccountHoverMyAccount))) #click on contact
        #sec_but.click()
        #
        but_loc = self.wait.until(EC.visibility_of_element_located((By.XPATH, self.myAccountIcon)))#hover over button
        ActionChains(self.driver).move_to_element(but_loc).perform()
        sec_but = self.wait.until(EC.visibility_of_element_located((By.XPATH, self.myAccountHoverMyAccount))) #click on contact
        sec_but.click()
        time.sleep(2)
'''

if __name__ == "__main__":
    unittest.main()





