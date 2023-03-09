# Generated from C:/Users/Eric/PycharmProjects/DesignProject/parse_function\Function.g4 by ANTLR 4.7
# encoding: utf-8
from antlr4 import *
from io import StringIO
from typing import TextIO
import sys

def serializedATN():
    with StringIO() as buf:
        buf.write("\3\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964\3\r")
        buf.write("+\4\2\t\2\4\3\t\3\4\4\t\4\3\2\3\2\3\2\3\2\3\2\3\2\3\2")
        buf.write("\3\2\3\2\3\2\3\2\3\2\5\2\25\n\2\3\2\3\2\3\2\3\2\3\2\3")
        buf.write("\2\3\2\3\2\3\2\3\2\3\2\7\2\"\n\2\f\2\16\2%\13\2\3\3\3")
        buf.write("\3\3\4\3\4\3\4\2\3\2\5\2\4\6\2\4\3\2\4\5\3\2\6\7\2-\2")
        buf.write("\24\3\2\2\2\4&\3\2\2\2\6(\3\2\2\2\b\t\b\2\1\2\t\n\7\3")
        buf.write("\2\2\n\13\7\t\2\2\13\f\5\2\2\2\f\r\7\n\2\2\r\25\3\2\2")
        buf.write("\2\16\17\7\t\2\2\17\20\5\2\2\2\20\21\7\n\2\2\21\25\3\2")
        buf.write("\2\2\22\25\7\13\2\2\23\25\7\f\2\2\24\b\3\2\2\2\24\16\3")
        buf.write("\2\2\2\24\22\3\2\2\2\24\23\3\2\2\2\25#\3\2\2\2\26\27\f")
        buf.write("\t\2\2\27\30\7\b\2\2\30\"\5\2\2\n\31\32\f\b\2\2\32\33")
        buf.write("\5\4\3\2\33\34\5\2\2\t\34\"\3\2\2\2\35\36\f\7\2\2\36\37")
        buf.write("\5\6\4\2\37 \5\2\2\b \"\3\2\2\2!\26\3\2\2\2!\31\3\2\2")
        buf.write("\2!\35\3\2\2\2\"%\3\2\2\2#!\3\2\2\2#$\3\2\2\2$\3\3\2\2")
        buf.write("\2%#\3\2\2\2&\'\t\2\2\2\'\5\3\2\2\2()\t\3\2\2)\7\3\2\2")
        buf.write("\2\5\24!#")
        return buf.getvalue()


class FunctionParser ( Parser ):

    grammarFileName = "Function.g4"

    atn = ATNDeserializer().deserialize(serializedATN())

    decisionsToDFA = [ DFA(ds, i) for i, ds in enumerate(atn.decisionToState) ]

    sharedContextCache = PredictionContextCache()

    literalNames = [ "<INVALID>", "<INVALID>", "'*'", "'/'", "'+'", "'-'", 
                     "'^'", "'('", "')'" ]

    symbolicNames = [ "<INVALID>", "SQRT", "MULT", "DIV", "PLUS", "MINUS", 
                      "POWER", "LBRACKET", "RBRACKET", "VAR", "NUM", "WHITESPACE" ]

    RULE_expr = 0
    RULE_multOp = 1
    RULE_plusOp = 2

    ruleNames =  [ "expr", "multOp", "plusOp" ]

    EOF = Token.EOF
    SQRT=1
    MULT=2
    DIV=3
    PLUS=4
    MINUS=5
    POWER=6
    LBRACKET=7
    RBRACKET=8
    VAR=9
    NUM=10
    WHITESPACE=11

    def __init__(self, input:TokenStream, output:TextIO = sys.stdout):
        super().__init__(input, output)
        self.checkVersion("4.7")
        self._interp = ParserATNSimulator(self, self.atn, self.decisionsToDFA, self.sharedContextCache)
        self._predicates = None



    class ExprContext(ParserRuleContext):

        def __init__(self, parser, parent:ParserRuleContext=None, invokingState:int=-1):
            super().__init__(parent, invokingState)
            self.parser = parser


        def getRuleIndex(self):
            return FunctionParser.RULE_expr

     
        def copyFrom(self, ctx:ParserRuleContext):
            super().copyFrom(ctx)


    class VarExprContext(ExprContext):

        def __init__(self, parser, ctx:ParserRuleContext): # actually a FunctionParser.ExprContext
            super().__init__(parser)
            self.copyFrom(ctx)

        def VAR(self):
            return self.getToken(FunctionParser.VAR, 0)

        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitVarExpr" ):
                return visitor.visitVarExpr(self)
            else:
                return visitor.visitChildren(self)


    class SqrtExprContext(ExprContext):

        def __init__(self, parser, ctx:ParserRuleContext): # actually a FunctionParser.ExprContext
            super().__init__(parser)
            self.copyFrom(ctx)

        def SQRT(self):
            return self.getToken(FunctionParser.SQRT, 0)
        def LBRACKET(self):
            return self.getToken(FunctionParser.LBRACKET, 0)
        def expr(self):
            return self.getTypedRuleContext(FunctionParser.ExprContext,0)

        def RBRACKET(self):
            return self.getToken(FunctionParser.RBRACKET, 0)

        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitSqrtExpr" ):
                return visitor.visitSqrtExpr(self)
            else:
                return visitor.visitChildren(self)


    class BracketExprContext(ExprContext):

        def __init__(self, parser, ctx:ParserRuleContext): # actually a FunctionParser.ExprContext
            super().__init__(parser)
            self.copyFrom(ctx)

        def LBRACKET(self):
            return self.getToken(FunctionParser.LBRACKET, 0)
        def expr(self):
            return self.getTypedRuleContext(FunctionParser.ExprContext,0)

        def RBRACKET(self):
            return self.getToken(FunctionParser.RBRACKET, 0)

        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitBracketExpr" ):
                return visitor.visitBracketExpr(self)
            else:
                return visitor.visitChildren(self)


    class PowExprContext(ExprContext):

        def __init__(self, parser, ctx:ParserRuleContext): # actually a FunctionParser.ExprContext
            super().__init__(parser)
            self.left = None # ExprContext
            self.right = None # ExprContext
            self.copyFrom(ctx)

        def POWER(self):
            return self.getToken(FunctionParser.POWER, 0)
        def expr(self, i:int=None):
            if i is None:
                return self.getTypedRuleContexts(FunctionParser.ExprContext)
            else:
                return self.getTypedRuleContext(FunctionParser.ExprContext,i)


        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitPowExpr" ):
                return visitor.visitPowExpr(self)
            else:
                return visitor.visitChildren(self)


    class MultExprContext(ExprContext):

        def __init__(self, parser, ctx:ParserRuleContext): # actually a FunctionParser.ExprContext
            super().__init__(parser)
            self.left = None # ExprContext
            self.right = None # ExprContext
            self.copyFrom(ctx)

        def multOp(self):
            return self.getTypedRuleContext(FunctionParser.MultOpContext,0)

        def expr(self, i:int=None):
            if i is None:
                return self.getTypedRuleContexts(FunctionParser.ExprContext)
            else:
                return self.getTypedRuleContext(FunctionParser.ExprContext,i)


        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitMultExpr" ):
                return visitor.visitMultExpr(self)
            else:
                return visitor.visitChildren(self)


    class NumExprContext(ExprContext):

        def __init__(self, parser, ctx:ParserRuleContext): # actually a FunctionParser.ExprContext
            super().__init__(parser)
            self.copyFrom(ctx)

        def NUM(self):
            return self.getToken(FunctionParser.NUM, 0)

        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitNumExpr" ):
                return visitor.visitNumExpr(self)
            else:
                return visitor.visitChildren(self)


    class PlusExprContext(ExprContext):

        def __init__(self, parser, ctx:ParserRuleContext): # actually a FunctionParser.ExprContext
            super().__init__(parser)
            self.left = None # ExprContext
            self.right = None # ExprContext
            self.copyFrom(ctx)

        def plusOp(self):
            return self.getTypedRuleContext(FunctionParser.PlusOpContext,0)

        def expr(self, i:int=None):
            if i is None:
                return self.getTypedRuleContexts(FunctionParser.ExprContext)
            else:
                return self.getTypedRuleContext(FunctionParser.ExprContext,i)


        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitPlusExpr" ):
                return visitor.visitPlusExpr(self)
            else:
                return visitor.visitChildren(self)



    def expr(self, _p:int=0):
        _parentctx = self._ctx
        _parentState = self.state
        localctx = FunctionParser.ExprContext(self, self._ctx, _parentState)
        _prevctx = localctx
        _startState = 0
        self.enterRecursionRule(localctx, 0, self.RULE_expr, _p)
        try:
            self.enterOuterAlt(localctx, 1)
            self.state = 18
            self._errHandler.sync(self)
            token = self._input.LA(1)
            if token in [FunctionParser.SQRT]:
                localctx = FunctionParser.SqrtExprContext(self, localctx)
                self._ctx = localctx
                _prevctx = localctx

                self.state = 7
                self.match(FunctionParser.SQRT)
                self.state = 8
                self.match(FunctionParser.LBRACKET)
                self.state = 9
                self.expr(0)
                self.state = 10
                self.match(FunctionParser.RBRACKET)
                pass
            elif token in [FunctionParser.LBRACKET]:
                localctx = FunctionParser.BracketExprContext(self, localctx)
                self._ctx = localctx
                _prevctx = localctx
                self.state = 12
                self.match(FunctionParser.LBRACKET)
                self.state = 13
                self.expr(0)
                self.state = 14
                self.match(FunctionParser.RBRACKET)
                pass
            elif token in [FunctionParser.VAR]:
                localctx = FunctionParser.VarExprContext(self, localctx)
                self._ctx = localctx
                _prevctx = localctx
                self.state = 16
                self.match(FunctionParser.VAR)
                pass
            elif token in [FunctionParser.NUM]:
                localctx = FunctionParser.NumExprContext(self, localctx)
                self._ctx = localctx
                _prevctx = localctx
                self.state = 17
                self.match(FunctionParser.NUM)
                pass
            else:
                raise NoViableAltException(self)

            self._ctx.stop = self._input.LT(-1)
            self.state = 33
            self._errHandler.sync(self)
            _alt = self._interp.adaptivePredict(self._input,2,self._ctx)
            while _alt!=2 and _alt!=ATN.INVALID_ALT_NUMBER:
                if _alt==1:
                    if self._parseListeners is not None:
                        self.triggerExitRuleEvent()
                    _prevctx = localctx
                    self.state = 31
                    self._errHandler.sync(self)
                    la_ = self._interp.adaptivePredict(self._input,1,self._ctx)
                    if la_ == 1:
                        localctx = FunctionParser.PowExprContext(self, FunctionParser.ExprContext(self, _parentctx, _parentState))
                        localctx.left = _prevctx
                        self.pushNewRecursionContext(localctx, _startState, self.RULE_expr)
                        self.state = 20
                        if not self.precpred(self._ctx, 7):
                            from antlr4.error.Errors import FailedPredicateException
                            raise FailedPredicateException(self, "self.precpred(self._ctx, 7)")
                        self.state = 21
                        self.match(FunctionParser.POWER)
                        self.state = 22
                        localctx.right = self.expr(8)
                        pass

                    elif la_ == 2:
                        localctx = FunctionParser.MultExprContext(self, FunctionParser.ExprContext(self, _parentctx, _parentState))
                        localctx.left = _prevctx
                        self.pushNewRecursionContext(localctx, _startState, self.RULE_expr)
                        self.state = 23
                        if not self.precpred(self._ctx, 6):
                            from antlr4.error.Errors import FailedPredicateException
                            raise FailedPredicateException(self, "self.precpred(self._ctx, 6)")
                        self.state = 24
                        self.multOp()
                        self.state = 25
                        localctx.right = self.expr(7)
                        pass

                    elif la_ == 3:
                        localctx = FunctionParser.PlusExprContext(self, FunctionParser.ExprContext(self, _parentctx, _parentState))
                        localctx.left = _prevctx
                        self.pushNewRecursionContext(localctx, _startState, self.RULE_expr)
                        self.state = 27
                        if not self.precpred(self._ctx, 5):
                            from antlr4.error.Errors import FailedPredicateException
                            raise FailedPredicateException(self, "self.precpred(self._ctx, 5)")
                        self.state = 28
                        self.plusOp()
                        self.state = 29
                        localctx.right = self.expr(6)
                        pass

             
                self.state = 35
                self._errHandler.sync(self)
                _alt = self._interp.adaptivePredict(self._input,2,self._ctx)

        except RecognitionException as re:
            localctx.exception = re
            self._errHandler.reportError(self, re)
            self._errHandler.recover(self, re)
        finally:
            self.unrollRecursionContexts(_parentctx)
        return localctx

    class MultOpContext(ParserRuleContext):

        def __init__(self, parser, parent:ParserRuleContext=None, invokingState:int=-1):
            super().__init__(parent, invokingState)
            self.parser = parser

        def MULT(self):
            return self.getToken(FunctionParser.MULT, 0)

        def DIV(self):
            return self.getToken(FunctionParser.DIV, 0)

        def getRuleIndex(self):
            return FunctionParser.RULE_multOp

        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitMultOp" ):
                return visitor.visitMultOp(self)
            else:
                return visitor.visitChildren(self)




    def multOp(self):

        localctx = FunctionParser.MultOpContext(self, self._ctx, self.state)
        self.enterRule(localctx, 2, self.RULE_multOp)
        self._la = 0 # Token type
        try:
            self.enterOuterAlt(localctx, 1)
            self.state = 36
            _la = self._input.LA(1)
            if not(_la==FunctionParser.MULT or _la==FunctionParser.DIV):
                self._errHandler.recoverInline(self)
            else:
                self._errHandler.reportMatch(self)
                self.consume()
        except RecognitionException as re:
            localctx.exception = re
            self._errHandler.reportError(self, re)
            self._errHandler.recover(self, re)
        finally:
            self.exitRule()
        return localctx

    class PlusOpContext(ParserRuleContext):

        def __init__(self, parser, parent:ParserRuleContext=None, invokingState:int=-1):
            super().__init__(parent, invokingState)
            self.parser = parser

        def PLUS(self):
            return self.getToken(FunctionParser.PLUS, 0)

        def MINUS(self):
            return self.getToken(FunctionParser.MINUS, 0)

        def getRuleIndex(self):
            return FunctionParser.RULE_plusOp

        def accept(self, visitor:ParseTreeVisitor):
            if hasattr( visitor, "visitPlusOp" ):
                return visitor.visitPlusOp(self)
            else:
                return visitor.visitChildren(self)




    def plusOp(self):

        localctx = FunctionParser.PlusOpContext(self, self._ctx, self.state)
        self.enterRule(localctx, 4, self.RULE_plusOp)
        self._la = 0 # Token type
        try:
            self.enterOuterAlt(localctx, 1)
            self.state = 38
            _la = self._input.LA(1)
            if not(_la==FunctionParser.PLUS or _la==FunctionParser.MINUS):
                self._errHandler.recoverInline(self)
            else:
                self._errHandler.reportMatch(self)
                self.consume()
        except RecognitionException as re:
            localctx.exception = re
            self._errHandler.reportError(self, re)
            self._errHandler.recover(self, re)
        finally:
            self.exitRule()
        return localctx



    def sempred(self, localctx:RuleContext, ruleIndex:int, predIndex:int):
        if self._predicates == None:
            self._predicates = dict()
        self._predicates[0] = self.expr_sempred
        pred = self._predicates.get(ruleIndex, None)
        if pred is None:
            raise Exception("No predicate with index:" + str(ruleIndex))
        else:
            return pred(localctx, predIndex)

    def expr_sempred(self, localctx:ExprContext, predIndex:int):
            if predIndex == 0:
                return self.precpred(self._ctx, 7)
         

            if predIndex == 1:
                return self.precpred(self._ctx, 6)
         

            if predIndex == 2:
                return self.precpred(self._ctx, 5)
         




