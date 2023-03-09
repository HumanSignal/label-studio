# Generated from C:/Users/Eric/PycharmProjects/DesignProject/parse_function\Function.g4 by ANTLR 4.7
from antlr4 import *
if __name__ is not None and "." in __name__:
    from .FunctionParser import FunctionParser
else:
    from FunctionParser import FunctionParser

# This class defines a complete generic visitor for a parse tree produced by FunctionParser.

class FunctionVisitor(ParseTreeVisitor):

    # Visit a parse tree produced by FunctionParser#varExpr.
    def visitVarExpr(self, ctx:FunctionParser.VarExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#sqrtExpr.
    def visitSqrtExpr(self, ctx:FunctionParser.SqrtExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#bracketExpr.
    def visitBracketExpr(self, ctx:FunctionParser.BracketExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#powExpr.
    def visitPowExpr(self, ctx:FunctionParser.PowExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#multExpr.
    def visitMultExpr(self, ctx:FunctionParser.MultExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#numExpr.
    def visitNumExpr(self, ctx:FunctionParser.NumExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#plusExpr.
    def visitPlusExpr(self, ctx:FunctionParser.PlusExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#multOp.
    def visitMultOp(self, ctx:FunctionParser.MultOpContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FunctionParser#plusOp.
    def visitPlusOp(self, ctx:FunctionParser.PlusOpContext):
        return self.visitChildren(ctx)



del FunctionParser