package Actions;

import Base.DoAction;
import Base.ForWhom;

public class FlewCloser implements DoAction {
    public String doSmth(){
        return "подлетел к Луне ближе";
    }

    public String PersonName(){
        return String.valueOf(ForWhom.NEZNAIKA);
    }
}
