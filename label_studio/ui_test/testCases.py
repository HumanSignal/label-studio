
testCaseFilename = 'testCases.txt'
formatTypeDevider = '----------'
testTypeNameBeginsWith = '====='
allowedTests = '+'
disallowedTests = '-'

testTypes_arr =[]
testTypes_arr.append([])
'''
testTypes_arr = [
    ["image", "jpg", "png"],
    ["font", "txt"],
    ["common formats", "csv", "json"]
]
'''


# Return formate name only
def getFormateName(name, testTypeNameBeginsWith):
    return name[len(testTypeNameBeginsWith):-1*len(testTypeNameBeginsWith)]
# print(getFormateName('=====Images=====', testTypeNameBeginsWith))
# print(getFormateName('=====Text=====', testTypeNameBeginsWith))
# print(getFormateName('=====Common Formats=====', testTypeNameBeginsWith))


print('..... Reading '+testCaseFilename+' file for extracting test-cases .....')
f = open(testCaseFilename, "r")
testCases = f.read()

print('..... All testCases are:')
# testCases = testCases.replace("\n", "")
allTestTypes_arr = testCases.split(formatTypeDevider)

n_testType = -1       #image, font, common files,...
# n_testTypeFormat = 0 #jpg, png,...
for t in allTestTypes_arr:
    t_arr = t.split('\n')
    for i in range(len(t_arr)):
        if t_arr[i] != '\n':
            if t_arr[i]:
                # print('n_testType='+str(n_testType))
                print(t_arr[i])
                if testTypeNameBeginsWith in t_arr[i]: # This is formats name
                    n_testType = n_testType + 1
                    testTypes_arr[n_testType].append(getFormateName(t_arr[i], testTypeNameBeginsWith))
                    testTypes_arr.append([])
                elif str(t_arr[i])[0] == allowedTests: # This formats will be tested
                    testTypes_arr[n_testType].append(t_arr[i][1:])
                elif str(t_arr[i])[0] == disallowedTests: # Excluded(not tested) formats
                    pass
                else:
                    print('\n***** ERROR: Only '+allowedTests+' or '+disallowedTests+' symbols must be presented before the test formate names into the file '+str(testCaseFilename)+'!!!\n')

# Deleting last empty row
del testTypes_arr[-1]

print('\n..... After parsing, The formats for UI testing are:')
for i in range(len(testTypes_arr)):
    print(str(testTypes_arr[i]))
    # for j in range(len(testTypes_arr[i])):
    #     print(testTypes_arr[i][j])


# ----------------------------------------------------


'''
=====image=====
+jpg
+png
-gif
----------
=====font=====
+txt
----------
=====common formats=====
+csv
-tsv
-txt
+json



{
    'image':['+jpg','+png','-gif'],
    'font':['text'],
    'common formats':['+csv','-tsv','-txt','+json']
}
'''





































