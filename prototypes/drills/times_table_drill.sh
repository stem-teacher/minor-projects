#!/bin/bash

# Function to generate a random number between 1 and 12
random_number() {
  echo $(( RANDOM % 12 + 1 ))
}

# Function to drill times tables
drill_times_table() {
  num_questions=$1
  correct=0
  start_time=$(date +%s)

  echo "Drilling times tables from 1 to 12:"
  echo "You will be asked $num_questions questions."

  for ((i = 1; i <= num_questions; i++)); do
    num1=$(random_number)
    num2=$(random_number)
    echo -n "$num1 x $num2 = "
    read answer
    correct_answer=$(( num1 * num2 ))

    if [ "$answer" -eq "$correct_answer" ]; then
      echo "Correct!"
      correct=$(( correct + 1 ))
    else
      echo "Wrong. The correct answer is $correct_answer."
    fi
  done

  end_time=$(date +%s)
  elapsed_time=$(( end_time - start_time ))

  echo "You got $correct out of $num_questions correct."
  echo "It took you $elapsed_time seconds."
}

# Main script
echo "Welcome to the Times Table Drilling Program"
echo -n "Enter the number of questions you want to practice (default is 20): "
read num_questions

# Validate input and set default if needed
if ! [[ "$num_questions" =~ ^[0-9]+$ ]]; then
  num_questions=20
fi

# Call the drill function
drill_times_table $num_questions
