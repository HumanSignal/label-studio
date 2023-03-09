grammar Function;

/* Expressions */
expr    : left=expr POWER right=expr    #powExpr
        | left=expr multOp right=expr   #multExpr
        | left=expr plusOp right=expr   #plusExpr
        | SQRT LBRACKET expr RBRACKET   #sqrtExpr
        | LBRACKET expr RBRACKET        #bracketExpr
        | VAR                           #varExpr
        | NUM                           #numExpr
        ;

/* Multiplicative operator */
multOp  : MULT | DIV;

/* Addition operator */
plusOp  : PLUS | MINUS;

/* Reserved keywords */
SQRT            : S Q R T;

/* Symbols */
MULT            : '*';
DIV             : '/';
PLUS            : '+';
MINUS           : '-';
POWER           : '^';
LBRACKET        : '(';
RBRACKET        : ')';
UNDERSCORE      : '_';

/* Tokens with content */
VAR             : LETTER (LETTER | DIGIT | UNDERSCORE)*;
NUM             : DIGIT+ ([.,] DIGIT+)?;

fragment LETTER : [A-Za-z];
fragment DIGIT  : [0-9];

/* Skipped content */
WHITESPACE      : [ \t\n\r] -> skip;

/* Letter fragments */
fragment A      : [aA];
fragment B      : [bB];
fragment C      : [cC];
fragment D      : [dD];
fragment E      : [eE];
fragment F      : [fF];
fragment G      : [gG];
fragment H      : [hH];
fragment I      : [iI];
fragment J      : [jJ];
fragment K      : [kK];
fragment L      : [lL];
fragment M      : [mM];
fragment N      : [nN];
fragment O      : [oO];
fragment P      : [pP];
fragment Q      : [qQ];
fragment R      : [rR];
fragment S      : [sS];
fragment T      : [tT];
fragment U      : [uU];
fragment V      : [vV];
fragment W      : [wW];
fragment X      : [xX];
fragment Y      : [yY];
fragment Z      : [zZ];