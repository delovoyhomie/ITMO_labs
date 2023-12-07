package Actions;

import Base.*;

public class FallAsleep implements DoAction {
    public String doSmth(){
        return "заснул";
    }
    public String PersonName(){
        return String.valueOf(ForWhom.DONUT);
    }
}
