import Actions.*;
import Characters.*;

public class Main {
    public static void main(String[] args){

        Donut donut = new Donut();
        Neznaika neznaika = new Neznaika();
        Moon moon = new Moon();

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

        donut.doAction(fallasleep, "");
        donut.doAction(sleepnotmuch, "");
        donut.doAction(tumblingallnight, "");


        neznaika.doAction(dontlookatmoon, "");
        neznaika.doAction(flewcloser, "");
        neznaika.doAction(gotothecabin, "bhjkfsd");
        neznaika.doAction(letrest, "");
        neznaika.doAction(notice, "которых не замечал раньше");
        neznaika.doAction(startwatch, "то и не мог сказать с уверенностью, видит ли он эти подробности");

        moon.doAction(madetwice, "");

        moon.doAction(gotothecabin, "");

        neznaika.fly();
        System.out.print(neznaika.Gender());
    }
}
