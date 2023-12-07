package Actions;

import Base.DoAction;
import Base.ForWhom;

public class Notice implements DoAction {
    public String doSmth(){
        return "замечает на поверхности Луны такие подробности";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.NEZNAIKA);
    }
}
