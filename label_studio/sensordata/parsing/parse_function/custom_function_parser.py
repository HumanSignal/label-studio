from antlr4 import *
from .gen.FunctionLexer import FunctionLexer
from .gen.FunctionParser import FunctionParser
from .basic_function_visitor import BasicFunctionVisitor
from .error_listener import FunctionErrorListener
from .parse_exception import ParseException


def parse(expr):
    """
    Parses the expression string and turns it into a python readable string (with variables).
    Passes a parse exception when the expression string is invalid.
    :param expr: The expression in string format. Syntax:
        Addition:               '+'
        Subtraction:            '-'
        Multiplication:         '*'
        Division:               '/'
        Exponentiation:         '^'
        Square Root Extraction: 'sqrt()'
        Brackets:               '(', ')'
    :return: Readable python string with variables.
    """
    # Build parser from string
    parser = FunctionParser(CommonTokenStream(FunctionLexer(InputStream(expr))))

    # Add custom error listener to parser
    parser._listeners = [FunctionErrorListener()]
    parser.buildParseTrees = True
    try:
        # Create parse tree
        tree = parser.expr()

        # Visit parse tree with custom visitor
        visitor = BasicFunctionVisitor()
        visitor.visit(tree)

        # Print statement for debugging purposes
        # print(visitor.debug)

        # Return result string from visitor
        return visitor.string
    except ParseException:
        # Pass parse exception
        raise
