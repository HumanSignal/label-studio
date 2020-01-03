import * as Checkers from "./utilities";
import * as Colors from "./colors";
import * as Floodfill from "./floodfill";
import * as Image from "./image";
import * as RLe from "./rle";
import * as UDate from "./date";
import { debounce } from "./debounce";
import { guidGenerator } from "./unique";
import { styleToProp } from "./styles";

export default { Image, Checkers, Colors, UDate, guidGenerator, debounce, styleToProp, RLe, Floodfill };
