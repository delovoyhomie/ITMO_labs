package se.ifmo.lab5.core.command.user;

import se.ifmo.lab5.Main;
import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;

/**
 * Class of command Save
 * @name save
 * @help save - save collection to file
 */
public class Save extends Command {
    public Save() {
        super("save", "сохранить коллекцию в файл");
    }

    @Override
    public Response execute(Request request) {
        CollectionManager.getInstance().save(Main.ROOT_FILE);
        return new Response(null);
    }
}
