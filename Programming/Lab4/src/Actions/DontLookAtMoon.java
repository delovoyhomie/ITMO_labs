package Actions;

import Base.DoAction;
import Base.ForWhom;

public class DontLookAtMoon implements DoAction {
    public String doSmth(){
        return "никогда не смотрел на Луну внимательно";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.NEZNAIKA);
    }
}
