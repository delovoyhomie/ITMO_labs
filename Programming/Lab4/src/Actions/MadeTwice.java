package Actions;

import Base.DoAction;
import Base.ForWhom;

public class MadeTwice implements DoAction {
    public String doSmth(){
        return "сделалась уже вдвое больше";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.MOON);
    }
}
