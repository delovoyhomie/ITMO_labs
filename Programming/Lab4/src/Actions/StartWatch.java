package Actions;

import Base.DoAction;
import Base.ForWhom;

public class StartWatch implements DoAction {
    public String doSmth(){
        return "стал смотреть на Луну внимательнее";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.NEZNAIKA);
    }
}
