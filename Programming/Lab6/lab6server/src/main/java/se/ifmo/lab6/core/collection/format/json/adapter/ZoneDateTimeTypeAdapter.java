package se.ifmo.lab6.core.collection.format.json.adapter;

import com.google.gson.*;

import java.lang.reflect.Type;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class ZoneDateTimeTypeAdapter implements JsonSerializer<ZonedDateTime>, JsonDeserializer<ZonedDateTime> {
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd/hh:mm:ss");

    @Override
    public JsonElement serialize(final ZonedDateTime zonedDateTime, final Type typeOfSrc,
                                 final JsonSerializationContext context) {
        return new JsonPrimitive(formatter.format(zonedDateTime));
    }

    @Override
    public ZonedDateTime deserialize(final JsonElement json, final Type typeOfT,
                                 final JsonDeserializationContext context) throws JsonParseException {
        return LocalDate.parse(json.getAsString(), formatter).atStartOfDay(ZoneId.systemDefault());
    }
}
