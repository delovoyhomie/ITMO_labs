package Actions;

import Base.DoAction;
import Base.ForWhom;

public class GoToTheCabin implements DoAction {
    public String doSmth(){
        return "отправился в астрономическую кабину";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.NEZNAIKA);
    }
}
