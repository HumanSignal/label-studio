from .gen.FunctionParser import FunctionParser
from .gen.FunctionVisitor import FunctionVisitor


class BasicFunctionVisitor(FunctionVisitor):

    def __init__(self):
        self.string = ""
        self.debug = ""
        self.expr_dict = dict([(FunctionParser.NumExprContext, self.visitNumExpr),
                               (FunctionParser.VarExprContext, self.visitVarExpr),
                               (FunctionParser.PowExprContext, self.visitPowExpr),
                               (FunctionParser.MultExprContext, self.visitMultExpr),
                               (FunctionParser.PlusExprContext, self.visitPlusExpr),
                               (FunctionParser.SqrtExprContext, self.visitSqrtExpr),
                               (FunctionParser.BracketExprContext, self.visitBracketExpr)])

    def visitExpr(self, ctx: FunctionParser.ExprContext):
        self.debug += "\nexpr:\t" + ctx.getText()

        for k in self.expr_dict.keys():
            if isinstance(ctx, k):
                self.expr_dict[k](ctx)

    def visitPowExpr(self, ctx: FunctionParser.PowExprContext):
        self.debug += "\npow:\t" + ctx.getText()

        self.visitExpr(ctx.left)
        self.string += "**"
        self.visitExpr(ctx.right)

    def visitMultExpr(self, ctx: FunctionParser.MultExprContext):
        self.debug += "\nmult:\t" + ctx.getText()

        self.visitExpr(ctx.left)
        self.visitMultOp(ctx.multOp())
        self.visitExpr(ctx.right)

    def visitPlusExpr(self, ctx: FunctionParser.PlusExprContext):
        self.debug += "\nplus:\t" + ctx.getText()

        self.visitExpr(ctx.left)
        self.visitPlusOp(ctx.plusOp())
        self.visitExpr(ctx.right)

    def visitSqrtExpr(self, ctx: FunctionParser.SqrtExprContext):
        self.debug += "\nsqrt:\t" + ctx.getText()

        self.string += "("
        self.visitExpr(ctx.expr())
        self.string += ")**0.5"

    def visitBracketExpr(self, ctx: FunctionParser.BracketExprContext):
        self.debug += "\nbracket:\t" + ctx.getText()

        self.string += "("
        self.visitExpr(ctx.expr())
        self.string += ")"

    def visitVarExpr(self, ctx: FunctionParser.VarExprContext):
        self.debug += "\nvar:\t" + ctx.getText()

        self.string += ctx.getText()

    def visitNumExpr(self, ctx: FunctionParser.NumExprContext):
        self.debug += "\nnum:\t" + ctx.getText()

        self.string += ctx.getText()

    def visitMultOp(self, ctx: FunctionParser.MultOpContext):
        self.debug += "\nmultOp:\t" + ctx.getText()

        self.string += ctx.getText()

    def visitPlusOp(self, ctx: FunctionParser.PlusOpContext):
        self.debug += "\nplusOp:\t" + ctx.getText()

        self.string += ctx.getText()
