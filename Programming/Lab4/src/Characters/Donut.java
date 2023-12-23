package Characters;

public class Donut extends SomeCharacter {
    public Donut(){
        super("Пончик");
    }

    @Override
    public String Gender() {
        return "Male";
    }

    public WannaExplain wannaExplain = new WannaExplain();

    public class WannaExplain {
        String phrase = "";

        public void setPhrase(String phrase) {
            this.phrase = phrase;
        }

        public String getPhrase() {
            return phrase;
        }
    }

    public String Speak(boolean inverse) {
        if (!inverse) return "Малыш хотел объяснить" + wannaExplain.getPhrase();
        return "Малыш не хотел объяснить" + wannaExplain.getPhrase();
    }
}
