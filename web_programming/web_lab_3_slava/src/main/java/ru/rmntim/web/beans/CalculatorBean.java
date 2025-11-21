package ru.rmntim.web.beans;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.SessionScoped;
import jakarta.inject.Named;
import lombok.Getter;
import lombok.Setter;
import ru.rmntim.web.models.Point;
import ru.rmntim.web.tools.DBCommunicator;

import java.io.Serializable;
import java.util.ArrayList;

@Named("calculatorBean")
@SessionScoped
public class CalculatorBean implements Serializable {

    @Getter
    private double x;
    @Getter
    private double y;
    @Setter
    @Getter
    private double r;

    @Setter
    @Getter
    private ArrayList<Point> bigList;
    private DBCommunicator dbCommunicator;

    @PostConstruct
    public void init() {
        x = 0;
        y = 0;
        r = 3;
        dbCommunicator = DBCommunicator.getInstance();
        bigList = dbCommunicator.getAll();
        if (bigList == null) {
            bigList = new ArrayList<>();
        }
    }

    public void reset() {
        dbCommunicator.clearAll();
        bigList.clear();
    }

    public String calc() {
        var point = new Point(x, y, r);
        point.calc();
        bigList.add(point);
        dbCommunicator.sendOne(point);
        return null;
    }

    public void setX(double x) {
        this.x = ((Long) Math.round(x * 1000)).doubleValue() / 1000;
    }

    public void setY(double y) {
        this.y = ((Long) Math.round(y * 1000)).doubleValue() / 1000;
    }
}
