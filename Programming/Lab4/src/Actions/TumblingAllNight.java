package Actions;

import Base.DoAction;
import Base.ForWhom;

public class TumblingAllNight implements DoAction {
    public String doSmth(){
        return "всю ночь прокувыркался";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.DONUT);
    }
}
