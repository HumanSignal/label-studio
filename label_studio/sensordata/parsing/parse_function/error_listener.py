from antlr4.error.ErrorListener import ErrorListener

from .parse_exception import ParseException


class FunctionErrorListener(ErrorListener):

    def __init__(self):
        super(FunctionErrorListener, self).__init__()

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        s = "Syntax Error at " + str(line) + ":" + str(column) + " - " + str(msg)
        raise ParseException(s)

    def reportAmbiguity(self, recognizer, dfa, startIndex, stopIndex, exact, ambigAlts, configs):
        raise ParseException("Ambiguity")

    def reportAttemptingFullContext(self, recognizer, dfa, startIndex, stopIndex, conflictingAlts, configs):
        raise ParseException("Attempting Full Context")

    def reportContextSensitivity(self, recognizer, dfa, startIndex, stopIndex, prediction, configs):
        raise ParseException("Context Sensitivity")
