package Actions;

import Base.DoAction;
import Base.ForWhom;

public class LetRest implements DoAction {
    public String doSmth(){
        return "решил дать ему отдохнуть";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.NEZNAIKA);
    }
}
