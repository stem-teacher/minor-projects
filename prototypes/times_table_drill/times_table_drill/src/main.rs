use rand::Rng;
use std::io;
use std::time::Instant;

fn main() {
    println!("Welcome to the Times Table Drilling Program");

    let mut num_questions = String::new();
    println!("Enter the number of questions you want to practice (default is 20): ");
    io::stdin().read_line(&mut num_questions).expect("Failed to read line");

    let num_questions: usize = num_questions.trim().parse().unwrap_or(20);

    let start_time = Instant::now();
    let mut correct = 0;

    for _ in 0..num_questions {
        let num1 = rand::thread_rng().gen_range(3..=12);
        let num2 = rand::thread_rng().gen_range(3..=12);
        println!("{} x {} = ", num1, num2);

        let mut answer = String::new();
        io::stdin().read_line(&mut answer).expect("Failed to read line");

        let answer: i32 = match answer.trim().parse() {
            Ok(num) => num,
            Err(_) => {
                println!("Please enter a valid number.");
                continue;
            }
        };

        if answer == num1 * num2 {
            println!("Correct!");
            correct += 1;
        } else {
            println!("Wrong. The correct answer is {}.", num1 * num2);
        }
    }

    let elapsed_time = start_time.elapsed().as_secs();
    println!("You got {} out of {} correct.", correct, num_questions);
    println!("It took you {} seconds.", elapsed_time);
}
