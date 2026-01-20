package ru.rmntim.web.points;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import ru.rmntim.web.auth.User;

public interface PointRepository extends JpaRepository<PointResult, Long> {
    List<PointResult> findAllByUserOrderByIdAsc(User user);

    @Modifying
    @Transactional
    @Query("delete from PointResult p where p.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);
}
