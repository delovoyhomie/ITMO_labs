package Actions;

import Base.DoAction;
import Base.ForWhom;

public class SleepNotMuch implements DoAction {
    public String doSmth(){
        return "спал мало";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.DONUT);
    }
}
