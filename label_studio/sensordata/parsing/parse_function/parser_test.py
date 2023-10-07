import pandas as pd
from parse_function import custom_function_parser as cfp


def test_df():
    return pd.DataFrame({'A': [1, 2, 3],
                         'B': [4, 5, 6],
                         'C': [7, 8, 9]})


parse_result = cfp.parse("A + B + C + 4 3")
print(parse_result)
df = test_df()
print(df)
df.eval("D = " + parse_result, inplace=True)
print(df)
