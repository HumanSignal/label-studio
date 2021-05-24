#
# Author: Hovhannes Atoyan (hovhannes.atoyan@gmail.com)
# UI automation for Label Studio
# Automated base steps for Image labeling (Setup, Import, Start, Export)
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
        self.wait = WebDriverWait(self.driver, 10)
        #
        self.site_url = 'http://localhost:8080/welcome'
        # self.current_page = self.site_url
        self.site_logo = '//a[@id="logo"]/img'
        self.page_import_url = 'http://localhost:8080/import'
        #
        # MENU
        self.menu_tasks = '//a[contains(text(), "Tasks")]'
        self.menu_model = '//a[contains(text(), "Model")]'
        self.menu_settings = '//a[contains(text(), "Settings")]'
        #
        # PAGES
        self.welcome_import_btn = '//a[contains(text(), "Import")]'
        self.welcome_Setup  = '//a[contains(text(), "Setup")]'
        self.welcome_Import = '//a[contains(text(), "Import")]'
        self.welcome_Start  = '//a[contains(text(), "Start")]'
        self.welcome_Export = '//a[contains(text(), "Export")]'
        #
        # IMPORT PAGE 
        self.import_img_draganddrop_id = 'file-input'
        self.import_file_src = ''
        self.import_img_src = 'img/imgForDragAndDrop.jpg'
        self.import_txt_src = 'text/txtForDragAndDrop.txt'
        self.import_csv_src  = 'commonFormats/csv/csvForDragAndDrop.csv'
        self.import_json_src = 'commonFormats/json/jsonForDragAndDrop.json'
        self.importPage_import_btn = '//button[@class="ui primary button"]'
        self.importPage_fileUploaded = '//h1[contains(text(), "Files uploaded")]'
        #
        # TASKS PAGE
        self.page_tasks_afterSave_url = 'http://localhost:8080/tasks?tab=1'
        self.page_tasks_afterSaveSubmit_url = 'http://localhost:8080/tasks?tab=1&labeling=1'
        self.tasks_label_btn = '//button[@class="ant-btn ant-btn-primary"]'
        self.tasks_goToSetup_btn = '//span[contains(text(), "Go to setup")]'
        self.tasks_no_data_for_labeling_txt = '//div[contains(text(), "No more data available for labeling")]'
        self.tasks_go_back_link = '//span[contains(text(), "Back")]'
        self.tasks_submitAfterLabeling = '//button[@class="ant-btn ant-btn-primary"]/span[contains(text(), "Label")]'
        self.tasks_afterSaveSubmit_btn = '//button[@class="ant-btn ant-btn-primary"]/span[contains(text(), "Submit")]'
        self.tasks_import_btn = '//button[@class="ant-btn flex-button"]/span[contains(text(), "Import")]'
        #
        self.tasks_allTasks_checkbox = '//label[@class="ant-checkbox-wrapper sc-jrsJCI emsrNO"]/span/input[@class="ant-checkbox-input"]'
        self.tasks_deleteTasks_btn = '//button[@class="ant-btn ant-btn-sm ant-btn-dangerous flex-button"]/span[contains(text(), "Delete tasks")]'
        self.tasks_deleteTasks_popupOk_btn = '//button[@class="ant-btn ant-btn-primary"]/span[contains(text(), "OK")]'
        self.tasks_afterDeleteTasks_import_btn = '//a/span[contains(text(), "Go to import")]'
        #
        # SETTINGS PAGE
        self.settings_bacic_templates_div = '//div[@id="basic-templates"]'
        self.settings_advanced_templates_div = '//div[@id="adv-templates"]'
        self.settings_proceed_btn = '//div[@id="proceed"]'
        self.settings_first_avalaible_template = 'a.use-template'
        self.settings_selectedTypeNameFromDivi = '//div[@class="three wide column category"]/i'  #<i class="icon sound">
        self.settings_selectedTypeDiv = '//div[@class="three wide column category"]'
        self.settings_save_btn = '//input[@id="submit_form"]'
        self.settings_exploreTasks_btn = '//a[contains(text(), "Explore Tasks")]'
        self.settings_importTasks_btn = '//a[contains(text(), "Import Tasks")]'
        self.settings_selectedTypeNameFromDivi_arr = '' #All div/i elements containing file-format type names from the page (like: audio, image, font,...)
        self.settings_selectedTypeDiv_arr = ''          #All DIV elements containing name and links for that file-format type (like: jpg, png, gif,...)
        self.availableTemplatesForChoosedType_arr = ''
        #
        #self.setup_label_car = '//span[@class="ant-tag"][contains(text(), "Car")]'
        self.setup_label_car = 'ant-tag'
        self.setup_save_btn = 'submit_form'
        self.setup_afterSave = '//p[contains(text(), "Label config saved!")]'
        self.start_label_car = 'ant-tag'
        self.start_submit_btn = '//button/span[contains(text(), "Submit ")]'
        self.export_submit_btn = '//a[contains(text(), "Export Completions")]'
        #

    def tearDown(self):
        self.driver.close()

    def test_cases(self):
        print("..... Opening the site "+self.site_url+" .....")
        self.driver.get(self.site_url)
        print("..... Executing Test-Cases .....\n")

        # # Get all templates for first time # !!!!!!!
        # if self.driver.current_url == self.site_url: #if we are on welcome page
        #     self.page_welcome()
        # self.go_to_page(self.menu_settings)
        
        # Taking test cases for testing
        from testCases import testTypes_arr

        print('\n..... Start testing for all choosed types (image, font, common formats, audio, html, time series) .....')
        for testTypeWithItsFormats in testTypes_arr:
            print('')
            print('----- Begin test chain for format '+testTypeWithItsFormats[0]+' -----')
            self.choosedFileType = testTypeWithItsFormats[0]
            #
            print('1##### Current_url is: '+str(self.driver.current_url))
            # Get all templates for first time
            if self.driver.current_url == self.site_url: #if we are on welcome page
                self.page_welcome()
            self.go_to_page(self.menu_settings)
            print('2##### Current_url is: '+str(self.driver.current_url))
            #
            # Get avaliable templates for choosed file-type from the site
            print('Geting all avaliable templates for choosed file-type "'+self.choosedFileType+'" from the site')
            availableTemplatesForChoosedType_arr = self.get_available_templates_for_choosed_type(self.choosedFileType)
            availableTemplatesForChoosedType_arr2 = [link.text for link in availableTemplatesForChoosedType_arr]
            #
            print('3##### availableTemplatesForChoosedType_arr2 is: '+str(availableTemplatesForChoosedType_arr2))
            #
            for i in range(1, len(testTypeWithItsFormats)):
                print('')
                print('-- Begin testing for test format: '+str(testTypeWithItsFormats[i])+' --')
                self.choosedFormat = testTypeWithItsFormats[i]
                #
                # if (self.choosedFormat == 'jpg') or (self.choosedFormat == 'txt'):
                if (self.choosedFormat == 'jpg'):
                    hhh = 0                #!!!!!!! must be deleted
                    howTemplatesToTake = 5 #!!!!!!! must be deleted
                    for tplName in availableTemplatesForChoosedType_arr2:
                        if hhh >= howTemplatesToTake: #!!!!!!! must be deleted
                            break                     #!!!!!!! must be deleted

                        print('')
                        print('----------==========----------')
                        #Import -> Tasks -> Settings -> select template -> Tasks -> Label -> Submit -> Back to Tasks -> Delete all tasks
                        #Import -> Tasks(no actions) -> Settings(select template and save) -> Tasks(Label and then Submit) -> Back to Tasks -> Delete all tasks
                        #
                        print('Template\'s name taken from the site is: '+str(tplName))
                        # Begin Labeling for choosed file-format with current template(current template for choosed file-format)
                        print('Starting Labeling')
                        self.go_to_page(self.site_logo)
                        if self.driver.current_url == self.site_url: #if we are on welcome page
                            self.page_welcome()
                            self.page_import()

                        tasks_deleteAllTasks = False
                        # self.page_tasks(tasks_deleteAllTasks) #No action if we will come from 'http://localhost:8080/import'
                        self.go_to_page(self.menu_settings)
                        self.page_settings(tplName)
                        self.page_tasks(tasks_deleteAllTasks) #Label and then Submit, if we are on page   'http://localhost:8080/tasks?tab=1'
                        self.page_tasks(tasks_deleteAllTasks) #Click on Go back button, if we are in page 'http://localhost:8080/tasks?tab=1&labeling=1'
                        tasks_deleteAllTasks = True
                        self.page_tasks(tasks_deleteAllTasks) #Delete all tasks and click on Tasks->Import, if we are on page 'http://localhost:8080/tasks?tab=1'

                        hhh = hhh + 1 #!!!!!!! must be deleted
                        print('----------==========----------')
                else:
                    print(' ... ')
                print('-- End testing for test format: '+str(testTypeWithItsFormats[i])+' --')
            print('----- End test chain for format '+testTypeWithItsFormats[0]+' -----')

    # Checks element existance by xpath
    def check_exists_by_xpath(self, xpath):
        try:
            self.driver.find_element_by_xpath(xpath)
        except NoSuchElementException:
            return False
        return True

    # Go to page by clicking on menu's appropriate link (like: '//a[@id="logo"]/img')
    def go_to_page(self, pageLinkFromMenu):
        # pos1 = pageLinkFromMenu.find('"')
        # pos2 = pageLinkFromMenu.find('"', pos1+2)
        # currPageName = pageLinkFromMenu[pos1+1:pos2]
        # print("..... Going to page ..... "+str(currPageName))
        print("..... Going to page ***Settings ..... "+str(pageLinkFromMenu))
        self.driver.find_element_by_xpath(pageLinkFromMenu).click()


    # WELCOME PAGE
    def page_welcome(self):
        print("..... Going to page Welcome .....")
        if self.check_exists_by_xpath(self.welcome_import_btn):
            # Click on Import button
            print("Welcome_page: Clicking on Import button")
            self.driver.find_element_by_xpath(self.welcome_import_btn).click()
        else:
            pass


    # IMPORT PAGE
    def page_import(self):
        print("..... Going to page Import .....")
        # after_file_uploaded_import_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.importPage_import_btn)))
        # after_file_uploaded_import_btn.click()
        time.sleep(2)
        if self.check_exists_by_xpath(self.importPage_fileUploaded):
            print('Ipmort_page: File already uploaded and now will be click on Import button')
            self.driver.find_element_by_xpath(self.importPage_import_btn).click()
        else:
            print('Ipmort_page: File not uploaded yet and will be uploaded (doing dragAndDrop of file)')
            # Detecting which file must be dragAndDropped
            if self.choosedFileType == 'image':
                if self.choosedFormat== 'jpg':
                    self.import_file_src = self.import_img_src
            elif self.choosedFileType == 'font':
                if self.choosedFormat== 'txt':
                    self.import_file_src = self.import_txt_src
            elif self.choosedFileType == 'common formats':
                if self.choosedFormat== 'csv':
                    self.import_file_src = self.import_csv_src
            elif self.choosedFileType == 'common formats':
                if self.choosedFormat== 'json':
                    self.import_file_src = self.import_json_src

            # dragAndDrop file
            print('Ipmort_page: Direktory is: ' + str(os.getcwd()))
            self.import_file_src = str(os.getcwd()) +'/'+ self.import_file_src
            print('Ipmort_page: File(image or txt or json ...) is: ' +str(self.import_file_src))
            self.driver.find_element_by_id(self.import_img_draganddrop_id).send_keys(self.import_file_src)
            print("Ipmort_page: File choosed by browser and placed into dragAndDrop area")

            time.sleep(2)
            # Click on Import button
            print("Ipmort_page: Clicking on Import button")
            self.driver.find_element_by_xpath(self.importPage_import_btn).click()
        time.sleep(3)


    # TASKS PAGE
    def page_tasks(self, tasks_deleteAllTasks):
        print("..... Going to page Tasks .....")
        if tasks_deleteAllTasks:
            # Deleting tasks
            print('###Task_page: Deleting all complated tasks')
            self.driver.find_element_by_xpath(self.tasks_allTasks_checkbox).click()
            print('Task_page: -All tasks were cheked')
            tasks_deleteTasks_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.tasks_deleteTasks_btn)))
            tasks_deleteTasks_btn.click()
            print('Task_page: -Clicked on button "Delete tasks"')
            tasks_deleteTasks_popupOk_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.tasks_deleteTasks_popupOk_btn)))
            tasks_deleteTasks_popupOk_btn.click()
            print('Task_page: -Clicked Ok on popup "Destructive action"')
            #
            # Clicking on Import
            time.sleep(2)
            print('Task_page: Clicking on Tasks->"Go oo import"')
            tasks_afterDeleteTasks_import_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.tasks_afterDeleteTasks_import_btn)))
            tasks_afterDeleteTasks_import_btn.click()
            # self.driver.find_element_by_xpath(self.tasks_import_btn).click()
        else:
            # Page Tasks, After Save
            if self.driver.current_url == self.page_tasks_afterSave_url:
                # Label and then Submit
                print('Task_page: Clicking on Tasks->Label button for Labeling')
                self.driver.find_element_by_xpath(self.tasks_submitAfterLabeling).click()
                # We will redirect to page: self.page_tasks_afterSaveSubmit_url = 'http://localhost:8080/tasks?tab=1&labeling=1'
                #
                if self.check_exists_by_xpath(self.tasks_go_back_link):
                    print('Task_page: 1@@@@@@@@@@')
                    print('Task_page: No more data available for labeling... so clicking on Back link')
                    self.driver.find_element_by_xpath(self.tasks_go_back_link).click()
                else:
                    print('Task_page: 2@@@@@@@@@@')
                    print('Task_page: Clicking on Tasks->Submit button')
                    self.driver.find_element_by_xpath(self.tasks_afterSaveSubmit_btn).click()
                # We will redirect to page: 'No more data available for labeling' , self.page_tasks_afterSaveSubmit_url = 'http://localhost:8080/tasks?tab=1&labeling=1'
            elif self.driver.current_url == self.page_tasks_afterSaveSubmit_url:
                # Go Back, due to No data in page
                print('Task_page: 3@@@@@@@@@@')
                print('Task_page: No more data available for labeling... so clicking on Back link')
                self.driver.find_element_by_xpath(self.tasks_go_back_link).click()                
            else:
                print('*****ERROR: Current url is: ' + str(self.driver.current_url))

            # Clicking on popup's submit button case
            # print('Task_page: Clicking on "Go to setup" button on the opened popup window "Labeling is not yet fully configured"')
            # tasks_goToSetup_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.tasks_goToSetup_btn))) !!!!!!!
            # tasks_goToSetup_btn.click()


    # SETTINGS PAGE
    def page_settings(self, choosedTemplateName):
        print("..... Going to page Settings .....")
        # Click for show "Advanced templates" section
        self.driver.find_element_by_xpath(self.settings_advanced_templates_div).click()
        #
        # Click on choosed format (choosed format from choosed file type)
        print('Settings_page: Clicking on choosed template-name: "'+str(choosedTemplateName)+'"')
        self.driver.find_element_by_xpath('//a[contains(text(), "'+choosedTemplateName+'")]').click()

        # Clicking on popup's submit button
        time.sleep(2)
        if self.check_exists_by_xpath(self.settings_proceed_btn):
            print('Settings_page: Clicking on "Proceed" button on the opened popup "Data that you\'ve put into textarea will be replaced, proceed?"')
            self.driver.find_element_by_xpath(self.settings_proceed_btn).click()
        time.sleep(2) # Waiting for popup window closing proces finished

        # Click on Save button
        print("Settings_page: Clicking on Save button")
        self.driver.find_element_by_xpath(self.settings_save_btn).click()

        print('Settings_page: Clicking on "Explore Tasks" button on the opened popup "Label config saved!"')
        settings_exploreTasks_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.settings_exploreTasks_btn)))
        settings_exploreTasks_btn.click()
        time.sleep(2) # Waiting for popup window closing proces finished

        # self.settings_importTasks_btn


    # Get all formats for given file type
    # Get available templates for choosed type(jpg OR txt OR csv OR json ...)
    def get_available_templates_for_choosed_type(self, choosedType):
        availableTemplatesForChoosedType_arr = []
        # Click for show "Advanced templates" section
        self.driver.find_element_by_xpath(self.settings_advanced_templates_div).click()
        #
        # Click on first template
        print("Clicking on first template for opening popup window")
        # self.driver.find_element_by_css_selector(self.settings_first_avalaible_template).click()
        settings_click_on_a = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, self.settings_first_avalaible_template)))
        settings_click_on_a.click() # !!!!!!!
        #
        # Clicking on popup's submit button
        print('Clicking on "Proceed" button on the opened popup "Data that you\'ve put into textarea will be replaced, proceed?"')
        settings_proceed_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.settings_proceed_btn)))
        settings_proceed_btn.click()
        time.sleep(2) # Waiting for popup window closing proces finished
        #
        # Get list of divs, each div contains all avaliable templates for that data type (jpg OR txt OR csv OR json)
        self.settings_selectedTypeDiv_arr = self.driver.find_elements_by_xpath(self.settings_selectedTypeDiv)
        # Get list of all div/i elements, meaning: get list of all template types
        self.settings_selectedTypeNameFromDivi_arr = self.driver.find_elements_by_xpath(self.settings_selectedTypeNameFromDivi)

        #print('Taking all template types')
        for i in range(len(self.settings_selectedTypeNameFromDivi_arr)):
            #<div..><i class="icon sound">...</i></div> ==> element i contains info about formate name (image, font, sound, ...)
            element_i_class = self.settings_selectedTypeNameFromDivi_arr[i].get_attribute("class")
            element_i_class = element_i_class[5:] #get "sound" from "icon sound"
            if choosedType == element_i_class:
                # All available templates for choosed type (jpg OR txt OR csv OR json)
                availableTemplatesForChoosedType_arr = self.settings_selectedTypeDiv_arr[i].find_elements_by_xpath('.//div/a')
        return availableTemplatesForChoosedType_arr


if __name__ == "__main__":
    unittest.main()



