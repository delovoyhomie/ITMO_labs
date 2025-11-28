package ru.rmntim.web.beans;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.SessionScoped;
import jakarta.inject.Named;
import lombok.Getter;
import lombok.Setter;
import ru.rmntim.web.models.Point;
import ru.rmntim.web.tools.DBCommunicator;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;

@Named("calculatorBean")
@SessionScoped
public class CalculatorBean implements Serializable {

    @Getter
    private BigDecimal x;
    @Getter
    private BigDecimal y;
    @Setter
    @Getter
    private BigDecimal r;

    @Setter
    @Getter
    private ArrayList<Point> bigList;
    private DBCommunicator dbCommunicator;

    @PostConstruct
    public void init() {
        x = BigDecimal.ZERO;
        y = BigDecimal.ZERO;
        r = BigDecimal.valueOf(3);
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

    public void setX(BigDecimal x) {
        if (x != null) {
            this.x = x;
        }
    }

    public void setY(BigDecimal y) {
        if (y != null) {
            this.y = y;
        }
    }
}
