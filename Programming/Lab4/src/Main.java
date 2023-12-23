import Actions.*;
import Characters.*;
import exceptions.IncorectPersonException;

public class Main {
    public static void main(String[] args){
        try {
            Donut donut = new Donut();
            Neznaika neznaika = new Neznaika();
//            Moon moon = new Moon();

            // local class
            class Moon extends SomeCharacter {
                public Moon(){
                    super("Луна");
                }

                @Override
                public String Gender() {
                    return "Female";
                }
            }

            final SomeCharacter moon = new Moon ();

            // anonymous
            final SomeCharacter ImposterMoon = new Moon(){
                @Override
                public String Gender(){
                    return ("Male");
                }
            };


            DontLookAtMoon dontlookatmoon = new DontLookAtMoon();
            FallAsleep fallasleep = new FallAsleep();
            FlewCloser flewcloser = new FlewCloser();
            GoToTheCabin gotothecabin = new GoToTheCabin();
            LetRest letrest = new LetRest();
            MadeTwice madetwice = new MadeTwice();
            Notice notice = new Notice();
            SleepNotMuch sleepnotmuch = new SleepNotMuch();
            StartWatch startwatch = new StartWatch();
            TumblingAllNight tumblingallnight = new TumblingAllNight();

            donut.wannaExplain.setPhrase(", какого он мнения о фрекен Бок");
            System.out.println(donut.Speak(false));

            donut.doAction(fallasleep, "");
            donut.doAction(sleepnotmuch, "");
            donut.doAction(tumblingallnight, null);


            neznaika.doAction(dontlookatmoon, "");
            neznaika.doAction(flewcloser, "");
            neznaika.doAction(gotothecabin, "");
            neznaika.doAction(letrest, "");
            neznaika.doAction(notice, "которых не замечал раньше");
            neznaika.doAction(startwatch, "то и не мог сказать с уверенностью, видит ли он эти подробности");

            moon.doAction(madetwice, "");

            moon.doAction(gotothecabin, "");

            neznaika.fly();
            System.out.print(neznaika.Gender());
        }
        catch (IncorectPersonException e) {
            System.out.println(e);
        }
    }
}
