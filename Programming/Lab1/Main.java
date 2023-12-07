import java.util.Random;

public class Main {
    public static void main (String[] args) {

       
        short salix = 48;
        char salix_sh = (char) salix;
        System.out.println(salix_sh);
// Пункт 1
        long[] c;
        c = new long[9];
        int q = 4;
        for (int i = 0; i < 9; i++) {
            c[i] = q;
            q += 2;
        }

// Пункт 2
        double[] x;
        x = new double[20];

        // Создаем объект класса Random для генерации случайных чисел
        Random random = new Random();
        
        // Задаем диапазон случайных чисел
        double min = -15.0;
        double max = 13.0;
        
        // Заполняем массив случайными числами в заданном диапазоне
        for (int i = 0; i < x.length; i++) {
            x[i] = min + (max - min) * random.nextDouble();
        }

        
// Пункт 3
        double[][] ans;
        ans = new double[9][20];
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 20; j++) {
                if (c[i] == 18) {
                    ans[i][j] =  Math.pow((1.0/3.0 + Math.cos(Math.tan(x[j]))) / 4.0, 3);     
                } else if (c[i] == 6 || c[i] == 10 || c[i] == 12 || c[i] == 14) {
                    double numerator = Math.pow(Math.cbrt(x[j]), 2 * Math.pow(1 - x[j], 3));
                    double denominator = Math.PI - Math.pow(Math.atan((x[j] - 1) / 28), Math.PI / Math.exp(x[j]));
                    double base = numerator / denominator;
                    double exponent = Math.log(Math.pow(Math.sin(x[j]), 2));
                    ans[i][j] = Math.pow(base, exponent);
                } else {
                    double numerator = Math.cos(x[j]);
                    double denominator = (3.0 / 4.0) + Math.exp(x[j]);
                    double base = numerator / denominator;

                    double power1 = Math.sin(x[j]);
                    double power2 = 2 + Math.sin(x[j]);
                    double power3 = (Math.atan((x[j] - 1) / 28) / 2) + 1;

                    ans[i][j] =  Math.cos(Math.pow(base, power1 * power2 * power3));
                }
            }
        }        
        // Выводим массив с пятью знаками после запятой
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 20; j++) {
                if (ans[i][j] > 100) {
                    System.out.printf(" " + "%8.1e ", ans[i][j]);
                } else {
                    System.out.printf(" " + "%8.5f ", ans[i][j]);
                }
            }
            System.out.println();
        }
    }
}