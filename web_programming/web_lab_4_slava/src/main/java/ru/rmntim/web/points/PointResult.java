package ru.rmntim.web.points;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.rmntim.web.auth.User;

@Entity
@Table(name = "points")
@Getter
@Setter
@NoArgsConstructor
public class PointResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 24, scale = 18)
    private BigDecimal x;

    @Column(nullable = false, precision = 24, scale = 18)
    private BigDecimal y;

    @Column(nullable = false, precision = 24, scale = 18)
    private BigDecimal r;

    @Column(nullable = false)
    private boolean insideArea;

    @Column(nullable = false)
    private Instant checkedAt;

    @Column(nullable = false)
    private long executionTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;
}
